import xml.etree.ElementTree as ET
import math,json,argparse
from pathlib import Path
from svgpathtools import parse_path
from shapely import LineString, Point, Polygon, unary_union
from shapely.ops import polygonize

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Extract original SVG faces for manual tooth mapping.')
parser.add_argument('--output-dir', type=Path, required=True)
args=parser.parse_args()
args.output_dir.mkdir(parents=True,exist_ok=True)
for species in ['felino','canino']:
    lines=[]
    for node in ET.parse(root/f'assets/odontograma-{species}.svg').iter('{http://www.w3.org/2000/svg}path'):
        if node.attrib.get('stroke')!='black': continue
        for sub in parse_path(node.attrib['d']).continuous_subpaths():
            coords=[]
            for seg in sub:
                steps=max(1,math.ceil(seg.length()/1.0))
                for k in range(steps):
                    z=seg.point(k/steps);coords.append((round(z.real,1),round(z.imag,1)))
            z=sub.end;coords.append((round(z.real,1),round(z.imag,1)))
            if len(set(coords))>1: lines.append(LineString(coords))
    faces=[p for p in polygonize(unary_union(lines)) if p.area>20]
    if species=='canino':
        nodes=list(ET.parse(root/f'assets/odontograma-{species}.svg').iter('{http://www.w3.org/2000/svg}path'))
        strokes=[]
        for sub in parse_path(nodes[28].attrib['d']).continuous_subpaths():
            pts=[]
            for seg in sub:
                steps=max(1,math.ceil(seg.length()/.5))
                for k in range(steps):
                    z=seg.point(k/steps);pts.append((z.real,z.imag))
            if len(pts)>=3: strokes.append(Polygon(pts).buffer(0))
        merged=unary_union(strokes).buffer(.15).buffer(-.15)
        for poly in (merged.geoms if hasattr(merged,'geoms') else [merged]):
            faces.extend(Polygon(r) for r in poly.interiors if Polygon(r).area>20)
        # The 201 frontal crown has a sub-pixel gap in the original stroked SVG.
        # Join only this original boundary; do not substitute an ellipse or box.
        front=[]
        for sub in parse_path(nodes[12].attrib['d']).continuous_subpaths():
            pts=[]
            for seg in sub:
                steps=max(1,math.ceil(seg.length()/.5))
                for k in range(steps):
                    z=seg.point(k/steps);pts.append((z.real,z.imag))
            z=sub.end;pts.append((z.real,z.imag))
            if len(set(pts))>1: front.append(LineString(pts))
        closed=unary_union(front).buffer(.6)
        for poly in (closed.geoms if hasattr(closed,'geoms') else [closed]):
            for ring in poly.interiors:
                face=Polygon(ring)
                if face.contains(Point(1125,860)): faces.append(face)
    print(species,len(faces))
    output=[]
    for i,p in enumerate(faces):
        x,y,X,Y=p.bounds
        output.append({'index':i,'area':p.area,'bounds':[x,y,X,Y],'coords':list(p.exterior.coords),'holes':[list(h.coords) for h in p.interiors]})
    (args.output_dir/f'{species}-faces.json').write_text(json.dumps(output))
    seeds=[(567,351),(416,450),(2502,1298),(386,1422)] if species=='felino' else [(200,110),(220,100)]
    for xy in seeds: print(xy,[(i,round(p.area),p.bounds) for i,p in enumerate(faces) if p.contains(Point(xy))])
