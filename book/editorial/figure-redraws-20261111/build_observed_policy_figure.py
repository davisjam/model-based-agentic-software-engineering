#!/usr/bin/env python3
"""Figure 2.13: author reference, 2026-11-18; shared SVG/TikZ geometry."""
from build_recovery_ownership_figures import Figure

def build(bw=False):
    f=Figure('observed-vs-declared','Observation compared with declared permission',444,176,bw)
    f.text(108,36,'Observed calls',14,True,anchor='middle')
    f.text(336,36,'Declared permissions',14,True,anchor='middle')
    f.path('M224,26 V174','(224,26) -- (224,174)',False,width=.65)
    for x in [4,240]:
        f.rect(x,58,76,38,'panel',6)
        f.text(x+38,82,'web',13.5,anchor='middle')
        f.rect(x+108,55,88,44,'panel',6)
        f.text(x+152,73,'report',13.5,anchor='middle')
        f.text(x+152,90,'service',13.5,anchor='middle')
        f.rect(x+108,130,88,38,'panel',6)
        f.text(x+152,154,'render',13.5,anchor='middle')
        f.path(f'M{x+76},77 H{x+107}',f'({x+76},77) -- ({x+107},77)',width=.9)
    f.path('M392,99 V129','(392,99) -- (392,129)',width=.9)
    f.path('M42,96 V149 H111','(42,96) -- (42,149) -- (111,149)',dashed=True,width=.9)
    # Cross is an annotation above the observed prohibited call, as in reference.
    f.path('M70,131 L79,140 M70,140 L79,131','(70,131) -- (79,140) (70,140) -- (79,131)',False,width=1.1)
    # Reference uses white boxes with black outlines and a lighter divider.
    f.s=[s.replace('stroke="#cccccc"','stroke="#222222"').replace('stroke="#d1d1d1"','stroke="#222222"') for s in f.s]
    f.t=[s.replace('draw=black!25','draw=black!90') for s in f.t]
    f.s=[s.replace('stroke="#222222"','stroke="#999999"') if 'M224,26 V174' in s else s for s in f.s]
    f.t=[s.replace('line width=0.65bp','draw=black!45,line width=0.65bp') if '(224,26) -- (224,174)' in s else s for s in f.t]
    return f.save()

if __name__=='__main__':
    for bw in [False,True]: print(build(bw))
