#!/usr/bin/env python3
"""Render the frozen SEIP observations; no repository mining or network access.

Source: book/data/docable-seip-261028/PROVENANCE.md. Four replacement charts;
PDF and SVG share geometry and the book's Source Serif 4 font. Retains the
full production/apparatus category mapping, not just aggregate size ratios.
"""
import csv
import json
import re
import os
from pathlib import Path
os.environ.setdefault('MPLCONFIGDIR', '/tmp/mage-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.ticker import MaxNLocator, FuncFormatter

BOOK = Path(__file__).resolve().parents[2]
DATA = BOOK / 'data/docable-seip-261028'
for font in (BOOK / 'fonts/SourceSerif4').glob('*.ttf'):
    font_manager.fontManager.addfont(str(font))
plt.rcParams.update({'font.family': 'Source Serif 4', 'font.size': 12,
    'svg.fonttype': 'none', 'svg.hashsalt': 'docable-seip-261028', 'pdf.fonttype': 42, 'axes.spines.top': False,
    'axes.spines.right': False, 'axes.spines.left': False, 'axes.spines.bottom': False,
    'axes.axisbelow': True, 'savefig.facecolor': 'white'})

def read(name):
    return list(csv.DictReader((DATA/name).open()))

def setup(ax):
    ax.set_xlim(.4,31.6)
    ax.set_xticks([1,11,21,31], ['Week 1','11','21','31'])
    ax.yaxis.set_major_locator(MaxNLocator(nbins=3, steps=[1,2,2.5,5,10]))
    ax.yaxis.set_major_formatter(FuncFormatter(lambda v,p: f'{v/1e6:g}M' if abs(v)>=1e6 else f'{v/1e3:g}K' if abs(v)>=1000 else f'{v:g}'))
    ax.grid(axis='y',linestyle=':',linewidth=.6,color='.7')
    ax.tick_params(length=0,pad=5)
    ax.set_ylim(bottom=0)

def save(fig,name,description):
    # Stable names allow regeneration without a manuscript rewrite.
    svg=BOOK/'assets'/f'{name}.svg'
    fig.savefig(svg,bbox_inches='tight',metadata={'Title':description,'Description':description,'Date':None})
    # Express SVG typography as presentation attributes as well as CSS. This
    # preserves Matplotlib's geometry while making font/anchor semantics explicit
    # to the repository's static figure analysis and non-CSS SVG consumers.
    def typography(match):
        tag = match.group(0)
        style = re.search(r'style="([^"]*)"', tag)
        if style:
            for key in ['font-size', 'font-family', 'text-anchor']:
                value = re.search(r'(?:^|;)\s*' + key + r':\s*([^;]+)', style.group(1))
                if value:
                    tag = tag[:-1] + ' ' + key + '="' + value.group(1).strip().replace('"', '&quot;') + '">'
        return tag
    normalized = re.sub(r'<text\b[^>]*>', typography, svg.read_text())
    svg.write_text('\n'.join(line.rstrip() for line in normalized.splitlines()) + '\n')
    fig.savefig(BOOK/'latex/assets'/f'{name}.pdf',bbox_inches='tight',metadata={'Title':description,'CreationDate':None,'ModDate':None})
    fig.savefig(Path('/tmp')/f'{name}.png',bbox_inches='tight',dpi=110)
    plt.close(fig)

rows=[r for r in read('weekly.csv') if r['complete']=='1']
assert len(rows)==31 and rows[-1]['end']=='2026-10-14'
x=[int(r['project_week']) for r in rows]
fig,ax=plt.subplots(figsize=(6.6,2.8),layout='constrained')
ax.bar(x,[int(r['work_commits']) for r in rows],color='.35',width=.8)
setup(ax)
save(fig,'docable-seip-work-261028','Landed work commits in 31 complete project weeks, March 12–October 14, 2026. Squash sources are expanded and deduplicated; bookkeeping is excluded. Total 36,578.')

fig,axs=plt.subplots(2,1,figsize=(6.6,5.4),layout='constrained')
for ax,key,label,end in [(axs[0],'epics_first_closed','Documented Epic completions',10),(axs[1],'retained_agent_starts','Recorded agent dispatches',11)]:
    ax.bar(x,[int(r[key]) if i>end else 0 for i,r in zip(x,rows)],color='.35',width=.8)
    setup(ax)
    ax.axvspan(.5,end+.5,facecolor='.93',edgecolor='none',linewidth=0,zorder=0)
    ax.text(.02,.96,label,transform=ax.transAxes,va='top')
    ax.text((end+1)/2,.48,'No recovered\nrecords',ha='center',va='center',transform=ax.get_xaxis_transform(),bbox={'facecolor':'white','edgecolor':'none','pad':2})
    ax.set_ylim(top=max(int(r[key]) for r in rows)*1.3)
save(fig,'docable-seip-activity-261028','Documented Epic completions and recorded agent dispatches, 31 complete weeks. Early shading marks missing records, not zero work; later coverage is uneven. Totals 428 completions and 14,392 dispatches are lower bounds.')

fig,ax=plt.subplots(figsize=(6.6,3.8),layout='constrained')
for key,label,style,grey in [('model_modules','Models','-','.1'),('multi_model_consumers','Multi-model consumers','--','.45'),('static_verifier_files','Static-analysis files',':','.1'),('dynamic_verifier_files','Dynamic-analysis files','-.','.45')]:
    ax.plot(x,[int(r[key]) for r in rows],label=label,linestyle=style,color=grey,linewidth=1.7)
setup(ax)
ax.legend(loc='upper left',frameon=False,ncol=1,fontsize=11)
ax.set_ylim(top=330)
save(fig,'docable-seip-analyses-261028','Model modules and model-linked analyses at week end. Week 31: 143 models, 45 multi-model consumers, 232 static-analysis files and 153 dynamic-analysis files. Inventories do not measure execution or assurance.')

sizes=read('code_size_mapped.csv'); groups=json.loads((DATA/'size_groups.json').read_text()); sx=[int(r['project_week']) for r in sizes]
fig,axs=plt.subplots(3,1,figsize=(6.6,9.3),layout='constrained',gridspec_kw={'height_ratios':[1.2,1.5,1]})
for ax,group in zip(axs[:2],['production','apparatus']):
    pairs=groups[group]
    bands=ax.stackplot(sx,*[[int(r[key]) for r in sizes] for key,label in pairs],labels=[label for key,label in pairs],colors=[str(.95-i*.1) for i in range(len(pairs))],linewidth=.45,edgecolor='.3')
    for band,hatch in zip(bands,['','///','...','\\\\','xx','--','++']): band.set_hatch(hatch)
    setup(ax)
    handles,labels=ax.get_legend_handles_labels()
    ax.legend(handles[::-1],labels[::-1],loc='upper left',bbox_to_anchor=(0,1.01),frameon=False,ncol=2,fontsize=10.5)
    ax.set_ylim(top=max(sum(int(r[key]) for key,label in pairs) for r in sizes)*(1.6 if group=='apparatus' else 1.4))
ratios=read('size_ratios.csv')
axs[2].plot(sx,[float(r['apparatus_per_production']) for r in ratios],color='.1',marker='o',markersize=4)
setup(axs[2]);axs[2].set_ylim(0,5)
axs[2].text(.02,.96,'Apparatus / production',transform=axs[2].transAxes,va='top')
save(fig,'docable-seip-capital-261028','Production components (top), engineering apparatus (middle), and apparatus-to-production ratio (bottom), measured at ten snapshots through week 31. All categories use one fixed cloc mapping. Lines interpolate snapshots. Week 31 ratio is 3.8; tests, models and infrastructure remain distinct.')
