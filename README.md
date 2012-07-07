GSTranslator2
=============

GSTranslator is a simple translator integrated with Gnome Shell. It uses [Google Translate](http://translate.google.com/) technology.

Screenshot
==========
![Screen 1](https://dl.dropbox.com/u/1050707/gstranslator/gstrans2_1.png)
![Screen 2](https://dl.dropbox.com/u/1050707/gstranslator/gstrans2_2.png)


Dependencies
============
1. Gnome 3.4
2. Python 2.7
3. Dbus
4. python-dbus (for Python 2.7)

Installation
============
### Gnome Shell extension:
1. Copy directory `gstranslator2@thof.github.com` to `~/.local/share/gnome-shell/extensions/`
2. As root, copy schema file `gstranslator2@thof.github.com/org.gnome.shell.extensions.gstranslator2.gschema.xml` to `/usr/share/glib-2.0/schemas/`
3. Compile schemas (as root): `glib-compile-schemas /usr/share/glib-2.0/schemas/`
4. Restart shell and enable [extension](https://extensions.gnome.org/local/)
### GSTranslator2 service:
1. You can copy `gstranslator2_service.py` to `/usr/local/bin` and make it executable `chmod +x /usr/local/bin/gstranslator2_service.py`

Running
=======
1. Enable [extension](https://extensions.gnome.org/local/)
2. Adjust settings (preferences icon)
3. Run GSTranslator2 service `gstranslator2_service.py`

Translation menu
================
By default this menu appear when you press <Super>g or click on "T" button. You can switch beetwen languages using <Control>Left/<Control>Right keys. To get standard 
translation use Enter key or <Shift>Enter for expanded translation.

Known issues
============
- service may hang for 5-10 seconds on one of the first words. Somehow urllib2.urlopen freezes for several seconds, but it does not report any error or warning. After that 
it responses immediately on the following words. Weird...

How it works?
=============
Gnome Shell extension communicates with GSTranslator service using DBus. It sends requests for translations. There are two types of requests: translate text from clipboard, 
translate text from menu entry. In response service written in Python, returns label with translation.
