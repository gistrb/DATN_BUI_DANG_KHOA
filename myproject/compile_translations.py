"""
Script to compile .po files to .mo files without gettext tools
"""
import polib
import os

# Compile Vietnamese
vi_po = polib.pofile('locale/vi/LC_MESSAGES/django.po')
vi_po.save_as_mofile('locale/vi/LC_MESSAGES/django.mo')
print("Compiled Vietnamese translation")

# Compile English  
en_po = polib.pofile('locale/en/LC_MESSAGES/django.po')
en_po.save_as_mofile('locale/en/LC_MESSAGES/django.mo')
print("Compiled English translation")

print("All translations compiled successfully!")
