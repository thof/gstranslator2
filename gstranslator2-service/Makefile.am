## Process this file with automake to produce Makefile.in
## Created by Anjuta

SUBDIRS = src 

gstranslator2_servicedocdir = ${prefix}/doc/gstranslator2_service
gstranslator2_servicedoc_DATA = \
	README\
	COPYING\
	AUTHORS\
	ChangeLog\
	INSTALL\
	NEWS


EXTRA_DIST = $(gstranslator2_servicedoc_DATA)


# Remove doc directory on uninstall
uninstall-local:
	-rm -r $(gstranslator2_servicedocdir)
