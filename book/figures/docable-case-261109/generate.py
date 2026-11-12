#!/usr/bin/env python3
"""Regenerate the Chapter 5 case-study charts from frozen aggregate data.
Run from any directory. Uses Matplotlib; native figures require mage-figures.sty.
The provenance receipt names the primary study sources and extraction checks.
"""
from pathlib import Path
import csv,json,os,re,html,tempfile
R=Path(__file__).resolve().parents[3]
B=R
D=R/'book/data/docable-case-261109';A=R/'book/assets';T=R/'book/tikz/figures';L=R/'book/latex/assets'
O=Path(os.environ.get('MAGE_FIGURE_PROOF_DIR',str(Path(tempfile.gettempdir())/'mage-docable-case-261109')))
for x in [A,T,L,O/'proofs']:x.mkdir(parents=True,exist_ok=True)
ed=json.loads((D/'effectiveness.json').read_text())
os.environ.setdefault('MPLCONFIGDIR',str(Path(tempfile.gettempdir())/'mage-matplotlib'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.ticker import FuncFormatter
for font in (R/'book/fonts/SourceSans3').glob('*.ttf'):font_manager.fontManager.addfont(str(font))
plt.rcParams.update({'font.family':'Source Sans 3','font.size':11,'svg.fonttype':'none','svg.hashsalt':'docable-case-261109','pdf.fonttype':42,'axes.spines.top':False,'axes.spines.right':False,'axes.spines.left':False,'axes.spines.bottom':False,'axes.axisbelow':True})
# Generator continues below; immutable data are the only plotted numbers.
def read(n):return list(csv.DictReader((D/n).open()))
def setup(ax):
 ax.set_xlim(.4,31.6);ax.set_xticks([1,11,21,31],['Week 1','11','21','31']);ax.tick_params(length=0,pad=3)
 ax.yaxis.set_major_formatter(FuncFormatter(lambda v,p:f'{v/1e6:g}M' if abs(v)>=1e6 else f'{v/1000:g}K' if abs(v)>=1000 else f'{v:g}'))
 ax.grid(axis='y',linestyle=':',linewidth=.5,color='.7');ax.set_ylim(bottom=0)
def save(fig,name,desc):
 fig.savefig(A/f'{name}.svg',metadata={'Title':desc,'Description':desc,'Date':None})
 fig.savefig(L/f'{name}.pdf',metadata={'Title':desc,'CreationDate':None,'ModDate':None})
 fig.savefig(O/'proofs'/f'{name}.png',dpi=150);plt.close(fig)
 path=A/f'{name}.svg';s=path.read_text()
 # Explicit attributes preserve semantics for SVG auditors that do not resolveCSS.
 def attrs(m):
  tag=m[0]
  for key in ['font-size','font-family','font-weight','text-anchor']:
   hit=re.search(r'(?:^|;|\")\s*'+key+r':\s*([^;\"]+)',tag)
   if hit and ' '+key+'=' not in tag:tag=tag[:-1]+' '+key+'="'+hit[1].strip().replace('"','&quot;')+'">'
  return tag
 s=re.sub(r'<text\b[^>]*>',attrs,s)
 s=re.sub(r'<svg\b([^>]*)>',lambda m:'<svg'+m[1]+' role="img" aria-labelledby="'+name+'-title '+name+'-desc">\n<title id="'+name+'-title">'+html.escape(desc.split('.')[0])+'.</title>\n<desc id="'+name+'-desc">'+html.escape(desc)+'</desc>',s,count=1)
 path.write_text(s)
rows=[r for r in read('weekly.csv') if r['complete']=='1'];x=[int(r['project_week']) for r in rows];assert len(x)==31
fig,axs=plt.subplots(2,2,figsize=(6.25,6.0));fig.subplots_adjust(left=.10,right=.98,bottom=.07,top=.94,wspace=.32,hspace=.45)
for ax in axs.flat:setup(ax)
axs[0,0].bar(x,[int(r['work_commits']) for r in rows],width=.78,color='.3');axs[0,0].set_yticks([0,1500,3000]);axs[0,0].set_ylim(0,3700)
axs[0,0].set_title('(a) Work commits',loc='left',fontsize=11,pad=10)
series=[('model_modules','Models','-','.05'),('multi_model_consumers','Consumers of ≥2 models','--','.45'),('static_verifier_files','Static',':','.05'),('dynamic_verifier_files','Dynamic','-.','.45')]
for key,label,style,c in series:axs[0,1].plot(x,[int(r[key]) for r in rows],color=c,linestyle=style,lw=1.5,label=label)
axs[0,1].set_ylim(0,400);axs[0,1].set_yticks([0,150,300]);axs[0,1].legend(loc='upper left',frameon=False,ncol=1,fontsize=10,columnspacing=.6,handlelength=1.5,handletextpad=.35);axs[0,1].set_title('(b) Models and checks',loc='left',fontsize=11,pad=10)
for ax,key,title,no,yt in [(axs[1,0],'retained_agent_starts','(c) Dispatches',11,[0,750,1500]),(axs[1,1],'epics_first_closed','(d) Epic completions',10,[0,20,40])]:
 ax.bar(x,[int(r[key]) for r in rows],width=.78,color='.3');ax.axvspan(.5,no+.5,color='.92',zorder=0);ax.text((no+1)/2,.55,'No records',transform=ax.get_xaxis_transform(),ha='center',va='center',fontsize=10)
 ax.set_title(title,loc='left',fontsize=11,pad=10);ax.set_yticks(yt);ax.set_ylim(0,yt[-1]*1.2)
save(fig,'docable-seip-longitudinal-261109','Four measures over 31 complete project weeks: work commits, models and checks, recovered dispatches, and documented Epic completions. Early shading denotes missing records, not zero activity. Counts do not measure productivity.')
sizes=read('code_size_mapped.csv');groups=json.loads((D/'size_groups.json').read_text());sx=[int(r['project_week']) for r in sizes];rat=read('size_ratios.csv')
fig,axs=plt.subplots(2,1,figsize=(6.25,6.6));fig.subplots_adjust(left=.12,right=.98,bottom=.08,top=.92,hspace=.62)
for ax,g,title in zip(axs,['production','apparatus'],['(a) Production implementation','(b) Engineering apparatus']):
 pairs=groups[g];bands=ax.stackplot(sx,*[[int(r[k]) for r in sizes] for k,l in pairs],colors=[str(.93-i*.10) for i in range(len(pairs))],edgecolor='.25',linewidth=.45,labels=[l for k,l in pairs]);
 for band,hatch in zip(bands,['','///','...','\\\\','xx','--','++']):band.set_hatch(hatch)
 setup(ax);ax.set_title(title,loc='left',fontsize=11,pad=10)
 # Match the visible stack from its top band to its bottom band.
 handles,labels=ax.get_legend_handles_labels()
 ax.legend(handles[::-1],labels[::-1],loc='upper left',frameon=False,ncol=1,fontsize=10,handlelength=1.5)
 ax.set_ylim(0,1050000 if g=='production' else 4400000);ax.set_yticks([0,300000,600000] if g=='production' else [0,1000000,2000000])
fig.text(.12,.025,'Apparatus / production:  Week 11 2.6×  ·  Week 21 3.6×  ·  Week 31 3.8×',fontsize=11)
save(fig,'docable-seip-composition-261109','Production and apparatus source at 10 snapshots. Composition bands remain separate from the apparatus/production ratio: 2.6 at week 11, 3.6 at week 21, 3.8 at week 31. Historical documentation excluded; interpolating lines are not measurements.')
fig,axs=plt.subplots(2,2,figsize=(6.25,7.4));fig.subplots_adjust(left=.14,right=.98,bottom=.13,top=.91,wspace=.60,hspace=.65)
labels=[r['format'].upper() for r in ed['checker_rows']];positions=list(range(4))
for i,(ax,title) in enumerate(zip(axs[0],['(a) Checker reduction','(b) Increased findings'])):
 for arm,offset,color,hatch in [('human',-.21,'white','///'),('docable',.21,'.2','')]:
  vals=[r['arms'][arm]['median_pct' if i==0 else 'increased_pct'] for r in ed['checker_rows']]
  ax.barh([y+offset for y in positions],[v if v is not None else 0 for v in vals],height=.36,color=color,edgecolor='black',linewidth=.8,hatch=hatch,label='Human (H)' if arm=='human' else 'DocAble (D)')
  for y,v,row in zip(positions,vals,ed['checker_rows']):
   if v is not None:ax.text(v+(2 if i==0 else .1),y+offset,(('H ' if arm=='human' else 'D ')+f'{v:.1f}') if i==0 else (('H ' if arm=='human' else 'D ')+f"{row['arms'][arm]['increased']}/{row['arms'][arm]['assessed']}"),va='center',fontsize=10)
 ax.set_yticks(positions,[f'{lab}\n(n={n})' for lab,n in zip(labels,[10,25,21,0])] if i==0 else labels);ax.invert_yaxis();ax.tick_params(length=0,pad=3);ax.set_title(title,loc='left',fontsize=11,pad=12);ax.grid(axis='x',linestyle=':',color='.8');ax.set_xlim(0,140 if i==0 else 9);ax.set_xticks([0,50,100] if i==0 else [0,3,6],['0%','50%','100%'] if i==0 else ['0%','3%','6%'])
axs[0,0].text(2,3,'Undefined',va='center',fontsize=10)
fig.legend(*axs[0,0].get_legend_handles_labels(),loc='upper center',ncol=2,frameon=False,fontsize=11,bbox_to_anchor=(.52,.995),handleheight=1.4,handlelength=2.2)
ax=axs[1,0];cts=ed['semantic']['counts'];labs=['Better','Within band','Worse'];vals=[cts['better'],cts['equal'],cts['worse']]
ax.barh(range(3),vals,color=['.3','.7','white'],edgecolor='black',linewidth=.8);ax.set_yticks(range(3),labs);ax.invert_yaxis();ax.set_xlim(0,62);ax.set_xticks([0,31,62]);ax.tick_params(length=0);ax.grid(axis='x',linestyle=':',color='.8');ax.set_title('(c) Semantic comparison',loc='left',fontsize=11,pad=12)
for y,v in enumerate(vals):ax.text(v+1,y,str(v),va='center',fontsize=11)
ax.text(0,-.25,'62 outputs; ±1 point parity',transform=ax.transAxes,fontsize=10)
ax=axs[1,1];cg=ed['criterion_groups'];names=['Alt text','Complex\nimages','Reading\norder','Headings','Other']
for arm,off,c,h in [('human',-.21,'white','///'),('docable',.21,'.2','')]:
 gains=[r[arm+'_gains'] for r in cg];loss=[-r[arm+'_losses'] for r in cg];ys=[i+off for i in range(5)]
 ax.barh(ys,gains,height=.36,color=c,hatch=h,edgecolor='black',linewidth=.8);ax.barh(ys,loss,height=.36,color=c,hatch=h,edgecolor='black',linewidth=.8)
 for y,gain,regression in zip(ys,gains,loss):
  ax.text(gain+1,y,('H ' if arm=='human' else 'D ')+('+' if gain else '')+str(gain),va='center',fontsize=10)
  if regression:ax.text(regression-1,y,str(regression),ha='right',va='center',fontsize=10)
ax.set_yticks(range(5),names);ax.invert_yaxis();ax.axvline(0,color='black',lw=1.1);ax.set_xlim(-12,60);ax.set_xticks([-10,0,20,40]);ax.tick_params(length=0);ax.grid(axis='x',linestyle=':',color='.8');ax.set_title('(d) Semantic changes',loc='left',fontsize=11,pad=12);ax.text(0,-.25,'Losses ← 0 → Gains\nDocument–criterion changes',transform=ax.transAxes,fontsize=10)
save(fig,'docable-human-evaluation-261109','Human and DocAble comparison: per-document median checker reductions; increased-finding counts; semantic 20 better, 41 parity, 1 worse of 62; document-criterion gains and regressions. Undefined XLSX percentage preserved; parity is not accessibility equivalence.')
# NativeTikZ/PGFPlots are generated from the same data.
def coords(xs,ys):return ' '.join(f'({a},{b})' for a,b in zip(xs,ys))
base='mage plot,width=5.65cm,height=4.8cm,xmin=.4,xmax=31.6,xtick={1,11,21,31},xticklabels={Week 1,11,21,31},ymin=0,tick label style={font=\\magefigurefont\\fontsize{10}{12}\\selectfont},title style={font=\\magefigurefont\\fontsize{11}{13}\\selectfont,at={(0,1.08)},anchor=west},legend style={draw=none,font=\\magefigurefont\\fontsize{10}{12}\\selectfont},legend cell align=left'
t='\\begin{tikzpicture}\n\\begin{groupplot}[group style={group size=2 by 2,horizontal sep=1.3cm,vertical sep=2cm},'+base+']\n'
t+='\\nextgroupplot[title={(a) Work commits},ymax=3700,ytick={0,1500,3000},yticklabels={0,1.5K,3K}]\n\\addplot[ybar,bar width=3.4pt,draw=black!30,fill=black!65] coordinates {'+coords(x,[int(r['work_commits']) for r in rows])+'};\n'
t+='\\nextgroupplot[title={(b) Models and checks},ymax=430,ytick={0,150,300},legend columns=1,legend pos=north west]\n'
for (key,label,sty,c),style in zip(series,['solid','dashed','densely dotted','dashdotted']):t+='\\addplot[black,'+style+',line width=.8pt,no marks] coordinates {'+coords(x,[int(r[key]) for r in rows])+'};\\addlegendentry{'+label+'}\n'
for key,title,n,ymax,yt,ytl in [('retained_agent_starts','(c) Dispatches',11,1800,'0,750,1500','0,750,1.5K'),('epics_first_closed','(d) Epic completions',10,48,'0,20,40','0,20,40')]:
 t+='\\nextgroupplot[title={'+title+'},ymax='+str(ymax)+',ytick={'+yt+'},yticklabels={'+ytl+'}]\n'
 t+='\\path[fill=black!8] (axis cs:.5,0) rectangle (axis cs:'+str(n+.5)+','+str(ymax)+');\n\\addplot[ybar,bar width=3.4pt,draw=black!30,fill=black!65] coordinates {'+coords(x,[int(r[key]) for r in rows])+'};\n\\node[align=center,font=\\magefigurefont\\fontsize{10}{12}\\selectfont] at (axis cs:'+str((n+1)/2)+','+str(ymax*.57)+') {No records};\n'
t+='\\end{groupplot}\n\\end{tikzpicture}\n';(T/'docable-seip-longitudinal-261109.tex').write_text(t)
# Stacked native bands retain their data order; vertical legends reverse it to match top-to-bottom bands.
t='\\begin{tikzpicture}\n';pat=['','north east lines','dots','north west lines','crosshatch','horizontal lines','grid']
for group,y,title,ymax,ticks in [('production',0,'(a) Production implementation',1050000,'0,300000,600000'),('apparatus',-8.4,'(b) Engineering apparatus',4400000,'0,1000000,2000000')]:
 pairs=groups[group];cum=[0]*len(sx)
 t+='\\begin{axis}[mage plot,at={(0,'+str(y)+'cm)},anchor=north west,width=12.6cm,height=5.2cm,scale only axis,xmin=.4,xmax=31.6,ymin=0,ymax='+str(ymax)+',xtick={1,11,21,31},xticklabels={Week 1,11,21,31},ytick={'+ticks+'},yticklabels={'+('0,300K,600K' if group=='production' else '0,1M,2M')+'},title={'+title+'},title style={font=\\magefigurefont\\fontsize{11}{13}\\selectfont,at={(0,1.07)},anchor=west},reverse legend,legend columns=1,legend pos=north west,legend style={draw=none,column sep=.3cm,font=\\magefigurefont\\fontsize{10}{12}\\selectfont}]\n'
 for j,(key,label) in enumerate(pairs):
  nxt=[v+int(row[key]) for v,row in zip(cum,sizes)];path=coords(sx,nxt)+' '+coords(sx[::-1],cum[::-1]);style='area legend,draw=black!60,fill=black!'+str(7+j*10)+',line width=.3pt'
  if pat[j]:style+=',postaction={pattern='+pat[j]+',pattern color=black!35}'
  t+='\\addplot['+style+'] coordinates {'+path+'} \\closedcycle;\\addlegendentry{'+label.replace('&','\\&')+'}\n';cum=nxt
 t+='\\end{axis}\n'
t+='\\node[anchor=north west,align=left,font=\\magefigurefont\\fontsize{11}{13}\\selectfont] at (0,-14.8) {Apparatus / production: week 11 2.6$\\times$; week 21 3.6$\\times$; week 31 3.8$\\times$};\n\\end{tikzpicture}\n';(T/'docable-seip-composition-261109.tex').write_text(t)
# Four outcome panels, with categorical barlabels wrapped rather than reduced.
t='\\begin{tikzpicture}\n';positions=[0,1,2,3]
for i in [0,1]:
 t+='\\begin{axis}[mage plot,at={('+str(i*7.4)+'cm,0cm)},anchor=north west,width=5.1cm,height=4.7cm,xmin=0,xmax='+('140' if i==0 else '9')+',ymin=-.6,ymax=3.6,y dir=reverse,axis lines*=left,xmajorgrids,ymajorgrids=false,ytick={0,1,2,3},yticklabels={'+('\\shortstack{PDF\\\\(n=10)},\\shortstack{DOCX\\\\(n=25)},\\shortstack{PPTX\\\\(n=21)},\\shortstack{XLSX\\\\(n=0)}' if i==0 else 'PDF,DOCX,PPTX,XLSX')+'},xtick={'+('0,50,100' if i==0 else '0,3,6')+'},xticklabels={'+('0\\%,50\\%,100\\%' if i==0 else '0\\%,3\\%,6\\%')+'},title={'+('(a) Checker reduction' if i==0 else '(b) Increased findings')+'},title style={at={(0,1.1)},anchor=west,font=\\magefigurefont\\fontsize{11}{13}\\selectfont}]\n'
 for arm,off,sty in [('human',-.21,'fill=white,postaction={pattern=north east lines,pattern color=black}'),('docable',.21,'fill=black!80')]:
  for j,r in enumerate(ed['checker_rows']):
   z=r['arms'][arm];v=z['median_pct' if i==0 else 'increased_pct']
   if v is None:continue
   t+='\\path[draw=black,line width=.7pt,'+sty+'] (axis cs:0,'+str(j+off-.18)+') rectangle (axis cs:'+str(v)+','+str(j+off+.18)+');\n'
   label=('H ' if arm=='human' else 'D ')+(f'{v:.1f}' if i==0 else f"{z['increased']}/{z['assessed']}")
   t+='\\node[anchor=west,font=\\magefigurefont\\fontsize{10}{12}\\selectfont,inner sep=1pt] at (axis cs:'+str(v+(.5 if i==0 else .04))+','+str(j+off)+') {'+label+'};\n'
 if i==0:t+='\\node[anchor=west,font=\\magefigurefont\\fontsize{10}{12}\\selectfont] at (axis cs:0,3) {Undefined};\n'
 t+='\\end{axis}\n'
t+='\\node[anchor=west,font=\\magefigurefont\\fontsize{11}{13}\\selectfont] at (0,1.7) {Human (H): hatched \\quad DocAble (D): solid};\n'
t+='\\begin{axis}[mage plot,at={(0cm,-7.3cm)},anchor=north west,width=5.1cm,height=4.7cm,xmin=0,xmax=62,ymin=-.6,ymax=2.6,y dir=reverse,xmajorgrids,ymajorgrids=false,ytick={0,1,2},yticklabels={Better,Within band,Worse},xtick={0,31,62},title={(c) Semantic comparison},title style={at={(0,1.1)},anchor=west,font=\\magefigurefont\\fontsize{11}{13}\\selectfont}]\n'
for j,v in enumerate([cts['better'],cts['equal'],cts['worse']]):
 t+='\\path[draw=black,fill=black!'+str([65,25,0][j])+'] (axis cs:0,'+str(j-.25)+') rectangle (axis cs:'+str(v)+','+str(j+.25)+');\\node[anchor=west,font=\\magefigurefont\\fontsize{11}{13}\\selectfont] at (axis cs:'+str(v)+','+str(j)+') {'+str(v)+'};\n'
t+='\\end{axis}\n\\node[anchor=north west,font=\\magefigurefont\\fontsize{10}{12}\\selectfont] at (0,-12.6) {62 outputs; $\\pm1$ point parity};\n'
t+='\\begin{axis}[mage plot,at={(7.4cm,-7.3cm)},anchor=north west,width=5.1cm,height=5.4cm,xmin=-12,xmax=60,ymin=-.6,ymax=4.6,y dir=reverse,xmajorgrids,ymajorgrids=false,ytick={0,1,2,3,4},yticklabels={Alt text,\\shortstack{Complex\\\\images},\\shortstack{Reading\\\\order},Headings,Other},xtick={-10,0,20,40},title={(d) Semantic changes},title style={at={(0,1.1)},anchor=west,font=\\magefigurefont\\fontsize{11}{13}\\selectfont}]\n'
t+='\\draw[black,line width=1.1pt] (axis cs:0,-.6)--(axis cs:0,4.6);\n'
for arm,off,sty in [('human',-.21,'fill=white,postaction={pattern=north east lines,pattern color=black}'),('docable',.21,'fill=black!80')]:
 for j,r in enumerate(cg):
  for v in [-r[arm+'_losses'],r[arm+'_gains']]:t+='\\path[draw=black,line width=.7pt,'+sty+'] (axis cs:0,'+str(j+off-.18)+') rectangle (axis cs:'+str(v)+','+str(j+off+.18)+');\n'
  gain=r[arm+'_gains'];loss=r[arm+'_losses'];label=('H ' if arm=='human' else 'D ')+('+' if gain else '')+str(gain)
  t+='\\node[anchor=west,font=\\magefigurefont\\fontsize{10}{12}\\selectfont,inner sep=1pt] at (axis cs:'+str(gain+1)+','+str(j+off)+') {'+label+'};\n'
  if loss:t+='\\node[anchor=east,font=\\magefigurefont\\fontsize{10}{12}\\selectfont,inner sep=1pt] at (axis cs:'+str(-loss-1)+','+str(j+off)+') {$-'+str(loss)+'$};\n'
t+='\\end{axis}\n\\node[anchor=north west,font=\\magefigurefont\\fontsize{10}{12}\\selectfont] at (7.4,-13.4) {\\shortstack[l]{Losses $\\leftarrow 0 \\rightarrow$ Gains\\\\Document--criterion changes}};\n\\end{tikzpicture}\n';(T/'docable-human-evaluation-261109.tex').write_text(t)
print('Figures written',list(x.name for x in T.glob('*.tex')))
