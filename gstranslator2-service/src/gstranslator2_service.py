#!/usr/bin/python2
#
# main.py
# Copyright (C) 2012 thof <radlewand@gmail.com>
# 
# gstranslator2-service is free software: you can redistribute it and/or modify it
# under the terms of the GNU General Public License as published by the
# Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# gstranslator2-service is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License along
# with this program.  If not, see <http://www.gnu.org/licenses/>.

import urllib2
import json
import signal
from gi.repository import Gio, Gtk, Gdk
import dbus.service
import gobject
from dbus.mainloop.glib import DBusGMainLoop
import textwrap
#import pprint

class Gstranslator(dbus.service.Object):
    def __init__(self):
        bus_name = dbus.service.BusName('com.github.thof.gstranslator2', bus=dbus.SessionBus())
        dbus.service.Object.__init__(self, bus_name, '/com/github/thof/gstranslator2')
        self.src_text = ''
        self.translation = ''
        self.trans_width = 80
        self.trans_expanded_width = 120
        self.clipboard = Gtk.Clipboard.get(Gdk.SELECTION_PRIMARY)
        self.mode = False
        self.lang_changed = False
        self.languages_list = []
        self.current_index = 0
        
        signal.signal(signal.SIGALRM, self.handler)
        self.load_config()
        
    def translate_clipboard(self, expanded):
        text = self.clipboard.wait_for_text()
        text = self.fix_string(text)
        if self.mode==expanded or self.lang_changed:
            self.translate_text(text, expanded)
            self.lang_changed = False
        elif text!=self.src_text:
            self.translate_text(text, expanded)
        
    def translate_text(self, text, expanded):
        self.src_text = text
        self.translation = self.get_translation(self.src_text)
        if expanded:
            self.translation = self.parse_json_full_translation(self.translation)
            self.mode = False;
        else:
            self.translation = self.parse_json_translation(self.translation)
            self.mode = True;
        
    def translate_custom(self, text):
        translation = self.get_translation(text)
        translation = self.parse_json_full_translation(translation)
        return translation
    
    def get_translation (self, text_trans):
        headers = {'User-Agent' : 'Mozilla/4.0 (compatible; MSIE 5.5; Windows NT)'}
        text = urllib2.quote(text_trans.encode('utf8'))
        url = 'http://translate.google.com/translate_a/t?client=json&sl='+self.languages_list[self.current_index][0]+'&tl='+self.languages_list[self.current_index][1]+'&hl='+self.languages_list[self.current_index][1]+'&text='+text
        request = urllib2.Request(url, '', headers)
        #print("Request. Wait...")
        #signal.alarm(5)
        response = urllib2.urlopen(request)
        #signal.alarm(0)
        #print("Got Answer")
        #print response.info()
        translation = response.read()
        return translation
    
    def parse_json_translation(self, translation):
        term_string = ''
        dump = json.loads(translation)
        #pprint.pprint(dump)
        dict_path = dump['sentences']
        trans_string = self.parse_basic_translation(dict_path, self.trans_width)
        
        try:
            dict_path = dump['dict']
        except KeyError:
            return trans_string[:-2]
        for d in dict_path:
            trans_string += d['pos']+"\n"
            for term in d['terms']:
                term_string += term+", "
            term_string = textwrap.fill(term_string, self.trans_width)
            trans_string += term_string[:-1]+"\n\n"
            term_string = ''
        return trans_string[:-2]
    
    def parse_json_full_translation(self, translation):
        term_string = ''
        dump = json.loads(translation)
        #pprint.pprint(dump)
        dict_path = dump['sentences']
        trans_string = self.parse_basic_translation(dict_path, self.trans_expanded_width)
        
        try:
            dict_path = dump['dict']
        except KeyError:
            return trans_string[:-2]
        for d in dict_path:
            trans_string += d['pos']+"\n"
            for e in d['entry']:
                term_string += e['word']+" - "
                try:
                    for r in e['reverse_translation']:
                        term_string += r+", "
                except KeyError:
                    term_string = term_string[:-3]
                term_string = textwrap.fill(term_string, self.trans_expanded_width)
                trans_string += term_string[:-1]+"\n"
                term_string = ''
            trans_string += "\n"
        return trans_string[:-2]
    
    def parse_basic_translation(self, dict_path, width):
        orig_string = ""
        trans_string = ""
        for d in dict_path:
            orig_string += d['orig']
            trans_string += d['trans'];
        if len(trans_string)<50:
            trans_string = textwrap.fill(orig_string+" - "+trans_string, width)
        else:
            trans_string = textwrap.fill(trans_string, width)
        trans_string += "\n\n"
        return trans_string
    
    def load_config(self):
        schema = 'org.gnome.shell.extensions.gstranslator2'
        settings = Gio.Settings.new(schema)
        self.trans_width = int(settings.get_string('width'))
        self.trans_full_width = int(settings.get_string('width-wide'))
        self.load_languages(settings.get_string('items'))
        
    def load_languages(self, lang_list):   
        langs = lang_list.split('|') 
        for l in langs:
            temp = l.split(';')
            if int(temp[2]):
                self.languages_list.append([temp[0], temp[1]])
        #pprint.pprint(self.languages_list)
        
    @dbus.service.method('com.github.thof.gstranslator2')
    def getCurrentLangs(self, text=''):
        return self.languages_list[self.current_index][0]+" -> "+self.languages_list[self.current_index][1]
        
    @dbus.service.method('com.github.thof.gstranslator2')
    def nextLangs(self, text=''):
        self.lang_changed = True
        if(self.current_index == len(self.languages_list)-1):
            self.current_index = 0
        else:
            self.current_index = self.current_index+1
        #print self.languages_list[self.current_index][0]+" -> "+self.languages_list[self.current_index][1]
        return self.languages_list[self.current_index][0]+" -> "+self.languages_list[self.current_index][1]
            
    @dbus.service.method('com.github.thof.gstranslator2')
    def prevLangs(self, text=''):
        self.lang_changed = True
        if(self.current_index == 0):
            self.current_index = len(self.languages_list)-1
        else:
            self.current_index = self.current_index-1
        #print self.languages_list[self.current_index][0]+" -> "+self.languages_list[self.current_index][1]
        return self.languages_list[self.current_index][0]+" -> "+self.languages_list[self.current_index][1]
        
    @dbus.service.method('com.github.thof.gstranslator2')
    def dbusGetTranslation(self, text=''):
        if not text:
            self.translate_clipboard(False)
        else:
            self.translate_text(text, False)
        return self.translation
    
    @dbus.service.method('com.github.thof.gstranslator2')
    def dbusGetExpandedTranslation(self, text=''):
        if not text:
            self.translate_clipboard(True)
        else:
            self.translate_text(text, True)
        return self.translation
    
    def fix_string (self, text):
        text = text.strip()
        if self.languages_list[self.current_index][0]=="en":
            for i in range(len(text)):
                if(text[i].isalnum()):
                    text = text[i:]
                    break
            for i in range(len(text)):
                if(text[-(i+1)].isalnum()):
                    text = text[:len(text)-i]
                    break
        text = text.replace('-\n', '')
        text = text.replace('\n', ' ')
        if text.isupper():
            text = text.lower()
        return text
        
    def handler (self, signum, frame):
        print 'Signal handler called with signal', signum
        raise IOError("Could not open url!")
        
    def main(self):
        mainloop = gobject.MainLoop()
        mainloop.run()

		
if __name__ == "__main__":
    DBusGMainLoop(set_as_default=True)
    gstrans = Gstranslator()
    print("Ready!")
    gstrans.main()