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
from copy import copy
from dbus.mainloop.glib import DBusGMainLoop
import textwrap
#import pprint

class Gstranslator(dbus.service.Object):
    def __init__(self):
        bus_name = dbus.service.BusName('com.github.thof.gstranslator2', bus=dbus.SessionBus())
        dbus.service.Object.__init__(self, bus_name, '/com/github/thof/gstranslator2')
        self.translation = ''
        self.clipboardCurrent = ''
        self.clipboardPrevious = ''
        self.trans_width = 80
        self.trans_expanded_width = 120
        self.clipboard = Gtk.Clipboard.get(Gdk.SELECTION_PRIMARY)
        self.languages_list = []
        self.current_index = 0
        self.states = []
        self.states.append([0, 0, 0, 0, 0])
        self.states.append([0, 0, 0, 0, 0])
        self.setState()
        self.clipboardPrevious = self.clipboard.wait_for_text()
        
        signal.signal(signal.SIGALRM, self.handler)
        self.load_config()
        
    def getClipboard(self):
        self.clipboardCurrent = self.clipboard.wait_for_text()
        text = self.fix_string(self.clipboardCurrent)
        return text
        
    def translateText(self, text, expanded):
        translation = self.getGoogleTranslation(text)
        if expanded:
            self.translation = self.parseJsonExpandedTranslation(translation)
        else:
            self.translation = self.parseJsonTranslation(translation)
        
    def translateCustom(self, text):
        translation = self.getGoogleTranslation(text)
        translation = self.parseJsonExpandedTranslation(translation)
        return translation
    
    def getGoogleTranslation(self, text_trans):
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
    
    def parseJsonTranslation(self, translation):
        term_string = ''
        dump = json.loads(translation)
        #pprint.pprint(dump)
        dict_path = dump['sentences']
        trans_string = self.parseBasicTranslation(dict_path, self.trans_width)
        
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
    
    def parseJsonExpandedTranslation(self, translation):
        term_string = ''
        dump = json.loads(translation)
        #pprint.pprint(dump)
        dict_path = dump['sentences']
        trans_string = self.parseBasicTranslation(dict_path, self.trans_expanded_width)
        
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
    
    def parseBasicTranslation(self, dict_path, width):
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
    
    def getTranslation(self, state, text=None):
        # default translation from clipboard
        if state == 0:
            self.translateText(self.getClipboard(), False)
        # expanded translation from clipboard
        elif state == 1:
            self.translateText(self.getClipboard(), True)
        # default translation from provided text
        elif state == 2:
            self.translateText(text, False)
        # expanded translation from provided text
        elif state == 3:
            self.translateText(text, True)
    
    def openTranslation(self, state, checkClipboard=True, text=None):
        if checkClipboard:
            if self.compareClipboards(): # if contents of previous and current clipboard are the same then use previous translation
                self.setState(state)
                return "-222"        
        self.getTranslation(state, text)
        self.setState(state)
        return self.translation
            
    
    def closeTranslation(self, state):
        if self.compareClipboards():    # if an old word is in the clipboard then close
            self.setState()
            return "-111"
        else:                           # otherwise prepare new translation
            self.getTranslation(state) 
            return self.translation
    
    def checkCond(self, defPrev, expPrev, defCurr, expCurr):
        if self.states[0][0]==defPrev and self.states[0][1]==expPrev and self.states[1][0]==defCurr and self.states[1][1]==expCurr:
            return True
        else:
            return False
    
    @dbus.service.method('com.github.thof.gstranslator2')
    def dbusGetTranslation(self, text, state):
        #state = int(state_string)
        # if languages were changed then prepare new translation in any case
        if self.isOpen(4):
            return self.openTranslation(state, False, text)
        # conditions regarding translation from input field
        elif state == 0 and (self.isOpen(2) or self.isOpen(3)):
            return self.closeTranslation(state)
        elif state == 2 or state == 3:
            return self.openTranslation(state, False, text)
        # conditions regarding translation from clipboard
        elif (state==0 or state==1) and self.checkCond(0,0,0,0): # 1 and 2
            return self.openTranslation(state)
        elif (state==0 and self.checkCond(0, 0, 1, 0)) or (state==1 and self.checkCond(0, 0, 0, 1)): # 3 and 6
            return self.closeTranslation(state)
        elif (state==1 and self.checkCond(0, 0, 1, 0)) or (state==0 and self.checkCond(0, 0, 0, 1)): # 4 and 5
            return self.openTranslation(state, False)
        # 3rd level
        elif state==0 and self.checkCond(1,0,0,0): # 1st
            return self.openTranslation(state)
        elif state==1 and self.checkCond(1,0,0,0): # 2nd
            return self.openTranslation(state, False)
        elif state==0 and self.checkCond(1,0,0,1): # 3rd
            return self.openTranslation(state, False)
        elif state==1 and self.checkCond(1,0,0,1): # 4th
            return self.closeTranslation(state)
        elif state==0 and self.checkCond(0,1,1,0): # 5th
            return self.closeTranslation(state)
        elif state==1 and self.checkCond(0,1,1,0): # 6th
            return self.openTranslation(state, False)
        elif state==0 and self.checkCond(0,1,0,0): # 7th
            return self.openTranslation(state, False)
        elif state==1 and self.checkCond(0,1,0,0): # 8th
            return self.openTranslation(state)
        
    @dbus.service.method('com.github.thof.gstranslator2')
    def getCurrentLangs(self, text=''):
        return self.languages_list[self.current_index][0]+" -> "+self.languages_list[self.current_index][1]
    
    @dbus.service.method('com.github.thof.gstranslator2')
    def changeLangs(self, direction):
        self.setState(4)
        if direction:
            if(self.current_index == len(self.languages_list)-1):
                self.current_index = 0
            else:
                self.current_index = self.current_index+1
        else:
            if(self.current_index == 0):
                self.current_index = len(self.languages_list) - 1
            else:
                self.current_index = self.current_index - 1
        return self.languages_list[self.current_index][0]+" -> "+self.languages_list[self.current_index][1]
    
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
    
    def compareClipboards(self):
        self.clipboardCurrent = self.clipboard.wait_for_text()
        if self.clipboardCurrent == None or self.clipboardCurrent == self.clipboardPrevious:
            return True
        else:
            self.clipboardPrevious = self.clipboardCurrent
            return False
    
    def setState (self, number=None):
        self.states[0] = copy(self.states[1])
        self.states[1][0] = 0 # translation from clipboard
        self.states[1][1] = 0 # expanded translation from clipboard
        self.states[1][2] = 0 # translation from input field
        self.states[1][3] = 0 # expanded translation from input field
        self.states[1][4] = 0 # change of languages
        if number is not None:
            self.states[1][number] = 1  
        print "prev: ",self.states[0][0]," ",self.states[0][1]," ",self.states[0][2]," ",self.states[0][3]," ",self.states[0][4]
        print "curr: ",self.states[1][0]," ",self.states[1][1]," ",self.states[1][2]," ",self.states[1][3]," ",self.states[1][4]
        print "\n"
            
    def isOpen (self, state):
        if self.states[1][state]:
            return True
        else:
            return False
        
    def wasOpen (self, state):
        if self.states[0][state]:
            return True
        else:
            return False
        
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
        
    def main(self):
        mainloop = gobject.MainLoop()
        mainloop.run()

		
if __name__ == "__main__":
    DBusGMainLoop(set_as_default=True)
    gstrans = Gstranslator()
    print("Ready!")
    gstrans.main()
