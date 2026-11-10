from pathlib import Path
import re,xml.etree.ElementTree as ET
out=Path('/private/tmp/mage-ch1-followup-20261110/machinery');path=out/'agentic-substrate.svg'
raw=path.read_text();(out/'agentic-substrate-before-web-scale.svg').write_text(raw)
root=ET.fromstring(raw);sf=2.25
# Serialize all geometric user units rather than leaving unhandled group transforms.
# Marker coordinates are dimensionless local arrow geometry; default markerUnits
# makes their displayed dimensions scale through each edge's stroke-width.
ns='{http://www.w3.org/2000/svg}'
number=r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?'
def fmt(x):return f'{float(x):.6f}'.rstrip('0').rstrip('.')
def scale_nums(s):return re.sub(number,lambda m:fmt(float(m[0])*sf),s)
def walk(el,in_defs=False):
 tag=el.tag.removeprefix(ns);in_defs=in_defs or tag=='defs'
 if not in_defs:
  for key in ('x','y','x1','y1','x2','y2','width','height','rx','ry','r','cx','cy','font-size','stroke-width','stroke-dasharray'):
   if key in el.attrib:el.set(key,scale_nums(el.get(key)))
  if 'viewBox' in el.attrib:el.set('viewBox',scale_nums(el.get('viewBox')))
  if 'd' in el.attrib:el.set('d',scale_nums(el.get('d')))
  if 'transform' in el.attrib:
   value=el.get('transform')
   value=re.sub(r'translate\(([^)]*)\)',lambda m:'translate('+scale_nums(m[1])+')',value)
   # Rotation angles remain angles. The current artwork has no cx/cy rotate args.
   el.set('transform',value)
 for ch in el:walk(ch,in_defs)
walk(root)
ET.register_namespace('',ns[1:-1])
ET.indent(root,space='  ')
text=ET.tostring(root,encoding='unicode')+'\n'
path.write_text(text)
assert root.get('width')=='1003.5'
assert root.get('height')=='1253.25'
assert 'rotate(-90)' in text
assert [t.text for t in root.iter(ns+'text')]==[t.text for t in ET.fromstring(raw).iter(ns+'text')]
print('Web SVG serialized at 2.25× physical size; all text strings unchanged.')
