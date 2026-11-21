#!/usr/bin/env python3
"""Rebuild the two static web fonts in src/assets/fonts/ (requires: pip install fonttools brotli).

Display: Archivo at wdth 125 / wght 800. Labels: JetBrains Mono at wght 600.
Basic Latin plus a few typographic marks only. Japanese uses the system stack.
"""
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.subset import Subsetter, Options

UNICODES = list(range(0x20, 0x7F)) + [0xA9, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2192, 0x2197, 0x2193]

JOBS = [
    ("node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2", {"wdth": 125, "wght": 800}, "src/assets/fonts/archivo-expanded-800.woff2"),
    ("node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2", {"wght": 600}, "src/assets/fonts/jetbrains-mono-600.woff2"),
]

for source, axes, target in JOBS:
    font = TTFont(source)
    # Axes the file does not carry are simply skipped.
    limits = {tag: value for tag, value in axes.items() if tag in {a.axisTag for a in font["fvar"].axes}}
    font = instancer.instantiateVariableFont(font, limits)
    options = Options()
    options.flavor = "woff2"
    options.layout_features = ["kern", "liga", "calt", "locl", "ccmp", "mark", "mkmk"]
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(target)
    print(target)
