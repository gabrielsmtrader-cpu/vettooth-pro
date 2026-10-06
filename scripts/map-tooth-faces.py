import json,argparse
from pathlib import Path
from shapely import Polygon
parser=argparse.ArgumentParser(description='Map extracted original SVG faces to Triadan IDs.')
parser.add_argument('--faces-dir',type=Path,required=True)
parser.add_argument('--output-dir',type=Path,required=True)
args=parser.parse_args()
args.output_dir.mkdir(parents=True,exist_ok=True)
maps={
'felino': '''1:401 2:402 3:403 4:404 5:104 6:102 7:103 8:101 9:107 12:301 13:302 14:303 15:204 16:203 17:202 18:201 19:304 20:207 21:407 22:408 23:409 24:109 25:108 26:106 27:307 28:308 29:309 30:209 31:208 32:206
33:107 34:109 35:108 36:106 37:207 38:209 39:208 40:206 41:407 42:408 43:409 44:307 45:308 46:309
48:407 49:404 50:402 51:403 52:409 53:408 54:403 56:404 57:402 58:303 60:304 61:302
62:109 65:107 66:108 67:106 68:104 69:103 70:102 71:101 73:104 74:103 75:102 76:101 77:204 79:203 80:202 81:201
83:307 84:304 85:302 86:303 87:309 88:308 89:209 92:207 93:208 94:206 95:204 96:203 97:202 98:201
100:204 101:104 102:103 103:102 104:201 105:101 106:202 107:203 109:404 110:403 111:402 112:401 113:304 114:303 115:302 116:301''',
'canino': '''0:201 1:202 2:203 3:204 4:304 5:303 6:302 7:301 8:101 9:102 10:103 11:104 12:404 13:403 14:402 15:401
16:107 17:106 18:105 19:104 20:103 21:102 22:101 24:202 25:203 26:204 27:205 29:206 30:207 31:404 32:403 33:304 34:402 35:401 36:301 37:302 38:303 159:201
40:204 41:203 42:202 43:201 44:104 45:103 46:102 47:101
50:110 51:210 52:109 53:108 54:107 55:106 56:105 57:410 58:409 59:408 60:407 61:406 62:405 63:310 64:309 65:308 66:307 67:306 68:305 69:209 70:208 71:207 72:206 73:205
74:110 75:109 76:108 77:107 78:106 79:105 80:210 81:209 82:208 83:207 84:206 85:205
86:410 87:409 88:408 89:407 90:406 91:405 92:310 93:309 94:308 95:307 96:306 97:305
98:101 100:102 101:103 102:104 103:105 104:106 105:107 106:108 107:109 108:110
110:411 111:409 112:410 113:405 114:404 115:403 116:402 117:401 118:406 119:407 120:408
124:201 125:202 126:203 127:204 128:205 129:206 130:207 131:208 132:209 133:210 135:311 136:309 137:310 138:305 139:304 140:303 141:302 142:301 143:306 144:307 145:308
148:304 150:311 151:303 152:302 153:301 154:401 155:402 156:403 157:404 158:411'''
}
result={}
for species,spec in maps.items():
 faces=json.loads((args.faces_dir/f'{species}-faces.json').read_text())
 zones=[]
 for token in spec.split():
  face,id=token.split(':');f=faces[int(face)]
  p=Polygon(f['coords']).simplify(.15,preserve_topology=True)
  d='M'+'L'.join(f'{x:.2f} {y:.2f}' for x,y in p.exterior.coords)+'Z'
  zones.append({'id':id,'viewKey':f'{species}-{face}','d':d})
 result[species]={'source':f'odontograma-{species}.svg','method':'Faces extracted from original vector boundaries; curve sampling <=1 SVG unit, simplification <=0.15 unit. IDs reviewed against source labels.','zones':zones}
for species,data in result.items():
 (args.output_dir/f'odontograma-{species}-contours.json').write_text(json.dumps(data,ensure_ascii=False))
 print(species,len(data['zones']),'views')
