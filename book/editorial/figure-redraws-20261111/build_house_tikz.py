from pathlib import Path
import xml.etree.ElementTree as ET
import re,math
ROOT=Path(__file__).resolve().parents[3]
SRC=ROOT/'book/editorial/figure-redraws-20261111'
S=.566
ns=lambda s:s.split('}')[-1]
def num(x):return f'{float(x):.5f}'.rstrip('0').rstrip('.')
def point(x,y):return '('+num(x)+','+num(y)+')'
def esc(t):
 return ''.join({'&':r'\&','%':r'\%','_':r'\_','#':r'\#','$':r'\$','{':r'\{','}':r'\}'}.get(c,c)for c in t)
def sty(e):
 d={}
 for x in e.get('style','').split(';'):
  if ':'in x:k,v=x.split(':',1);d[k]=v
 return d
def rich(e):
 out=esc(e.text or '')
 for c in e:
  t=rich(c);st=sty(c)
  if c.get('font-weight')=='bold' or st.get('font-weight')=='bold':t=r'\textbf{'+t+'}'
  if c.get('font-style')=='italic' or st.get('font-style')=='italic':t=r'\textit{'+t+'}'
  out+=t+esc(c.tail or '')
 return out
fills={'header':8,'blue':12,'purple':7,'green':8,'yellow':4,'red':12}
def color(s):
 if s is None or s=='none':return None
 if s=='white':return 'white'
 if s.startswith('url('):return 'black!'+str(fills[s[5:-1]])
 if s.startswith('#'):
  raw=s[1:];raw=''.join(c*2 for c in raw)if len(raw)==3 else raw
  a=sum(int(raw[i:i+2],16)for i in [0,2,4])/3
  return 'black!'+str(round((255-a)/255*100))
 return 'black'
def pathdata(d):
 toks=re.findall(r'[MLHVQCZmlhvqcz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?',d)
 i=0;x=y=0;out=[];cmd=''
 while i<len(toks):
  if re.match('[A-Za-z]',toks[i]):cmd=toks[i];i+=1
  if cmd=='Z':out.append('-- cycle');cmd='';continue
  if cmd not in ['M','L','H','V','Q','C']:raise ValueError((cmd,d))
  n={'M':2,'L':2,'H':1,'V':1,'Q':4,'C':6}[cmd];vals=list(map(float,toks[i:i+n]));i+=n
  if cmd in ['M','L']:
   x,y=vals;out.append((''if cmd=='M'else'-- ')+point(x,y));cmd='L'
  elif cmd=='H':x=vals[0];out.append('-- '+point(x,y))
  elif cmd=='V':y=vals[0];out.append('-- '+point(x,y))
  elif cmd=='Q':
   qx,qy,nx,ny=vals;c1=(x+2*(qx-x)/3,y+2*(qy-y)/3);c2=(nx+2*(qx-nx)/3,ny+2*(qy-ny)/3)
   out.append('.. controls '+point(*c1)+' and '+point(*c2)+' .. '+point(nx,ny));x,y=nx,ny
  else:
   a,b,c,d,x,y=vals;out.append('.. controls '+point(a,b)+' and '+point(c,d)+' .. '+point(x,y))
 return ' '.join(out)
for number,stem in [('2-9','from-nodes-to-composition'),('2-10','canonical-behavioral'),('2-16','observed-vs-declared'),('2-17','service-flow-model')]:
 svg=ET.parse(SRC/f'figure-{number}-house-bw.svg').getroot()
 out=[f'% Book-style revision of author-supplied Figure {number.replace("-",".")} reference; editable native counterpart.\n',r'\begin{tikzpicture}[x=.566bp,y=-.566bp,font=\magefigurefont\fontsize{10.8}{12}\selectfont,>=Latex]'+'\n']
 for e in svg:
  tag=ns(e.tag)
  if tag in ['title','desc','defs','style']:continue
  a=e.attrib;st=sty(e)
  if tag=='text':
   size=float(st.get('font-size',a.get('font-size','19')).removesuffix('px'))
   fs=max(10,min(14,size*S*72.27/72));font=r'\magefigurefont'+(r'\bfseries'if st.get('font-weight')=='bold'else'')+(r'\itshape'if st.get('font-style')=='italic'else'')+r'\fontsize{'+num(fs)+'}{'+num(fs*1.15)+r'}\selectfont'
   anchor={'middle':'base','end':'base east'}.get(a.get('text-anchor'),'base west')
   out.append(r'\node[anchor='+anchor+',inner sep=0pt,font={'+font+'}] at '+point(a['x'],a['y'])+' {'+rich(e)+'};\n');continue
  fill=color(a.get('fill'));stroke=color(a.get('stroke'));width=float(a.get('stroke-width','1'))*S
  opts=[]
  if tag=='path' and a.get('class')=='edge':fill=None;stroke='black!85';width=1.2*S;opts.append('-{Latex[length=4.5bp,width=4bp]}')
  if tag=='path' and a.get('class')=='leader':fill=None;stroke='black!80';width=.8*S
  if fill:opts.append('fill='+fill)
  if stroke:opts+=['draw='+stroke,'line width='+num(width)+'bp']
  if a.get('stroke-dasharray'):opts.append('dash pattern=on '+num(9*S)+'bp off '+num(6*S)+'bp')
  opt=','.join(opts)
  if tag=='rect':
   x,y,w,h=map(float,[a.get('x','0'),a.get('y','0'),a['width'],a['height']]);rx=float(a.get('rx','0'))*S
   if rx:opt+=',rounded corners='+num(rx)+'bp'
   out.append(r'\path['+opt+'] '+point(x,y)+' rectangle '+point(x+w,y+h)+';\n')
  elif tag=='ellipse':out.append(r'\path['+opt+'] '+point(a['cx'],a['cy'])+' ellipse[x radius='+num(float(a['rx'])*S)+'bp,y radius='+num(float(a['ry'])*S)+'bp];\n')
  elif tag=='circle':out.append(r'\path['+opt+'] '+point(a['cx'],a['cy'])+' circle[radius='+num(float(a['r'])*S)+'bp];\n')
  elif tag=='path':out.append(r'\path['+opt+'] '+pathdata(a['d'])+';\n')
  else:raise ValueError(tag)
 out.append('\\end{tikzpicture}\n');(ROOT/f'book/tikz/figures/{stem}.tex').write_text(''.join(out))
 b=ROOT/'latex/build/reference-native-proof';b.mkdir(parents=True,exist_ok=True)
 (b/f'{stem}.tex').write_text(r'''\documentclass{article}
\usepackage[paperwidth=22cm,paperheight=24cm,margin=1cm]{geometry}
\newcommand{\DoNotLoadEpstopdf}{}
\input{book/tikz/mage-figures.sty}
\usepackage[active,tightpage]{preview}
\PreviewEnvironment{tikzpicture}
\setlength\PreviewBorder{3pt}
\begin{document}
\input{book/tikz/figures/'''+stem+r'''.tex}
\end{document}
''')
 print(stem)
