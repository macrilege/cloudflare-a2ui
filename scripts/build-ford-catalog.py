import json,re,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parent.parent
source=json.loads((root/'ford-catalog-capture.json').read_text())
colors={'PN4LG':'magenta','PN4FS':'orange','PN4EN':'avalanche','PN4A7':'red','PN4KN':'blue','PN4F2':'adriatic','PNZAT':'black','PNYW3':'white','PN4JA':'gray','PN4HR':'starwhite','PN4GM':'black','PN4HZ':'white'}
aliases={'D2UET':'standard','D2UEF':'standard','D2VBV':'standard','D2UDW':'standard','D2VAS':'bronze','D2VBQ':'rtr','D2FCM':'twenty'}
standard_images={'D2UET':'/assets/mustang/gtstandard.webp','D2UEF':'/assets/mustang/ecostandard.webp','D2VBV':'/assets/mustang/gtconvertible.webp'}
models={'gtfastback':'2026 Mustang GT Fastback','gtpremiumconvertible':'2026 Mustang GT Premium Convertible','ecoboostpremiumfastback':'2026 Mustang EcoBoost Premium Fastback','ecoboostpremiumconvertible':'2026 Mustang EcoBoost Premium Convertible','active':'2026 Explorer Active (200A)'}
catalogs={};css=[]
for trim,items in source['catalogs'].items():
 palette={};wheels={}
 for item in items:
  if item['id'].startswith('PN'):
   key=colors[item['id']];rgb=re.search(r'rgb\(([^)]+)\)',item['swatch'])[1]
   palette[key]={'label':item['name'],'swatch':trim+'-'+key};css.append('.paint-swatch.'+trim+'-'+key+'{background:rgb('+rgb+')}')
  elif item.get('image'):
   code=item['id'];key=aliases.get(code,code.lower());image=standard_images.get(code)
   if not image:
    filename=code.lower()+Path(item['image'].split('?')[0]).suffix;image='/assets/ford/'+filename;target=root/'public'/image.lstrip('/')
    target.parent.mkdir(exist_ok=True)
    if not target.exists():target.write_bytes(urllib.request.urlopen(item['image'].split('?')[0],timeout=30).read())
   wheels[key]={'code':code,'label':item['name'],'image':image,'note':item.get('requirement','Standard wheels' if key=='standard' else 'Optional wheels')}
 catalogs[trim]={'colors':palette,'wheels':wheels}
builds=[];seen=set()
for b in source['builds']:
 trim=b['trim'];color=colors[b['color']];wheel=aliases.get(b['wheel'],b['wheel'].lower());selected=b['selected'];drive='4wd' if any(s['id']=='DR--F' for s in selected) else 'rwd';trans='manual' if b['trans']=='TR-AX' else 'automatic';identity=(trim,color,wheel,drive,trans)
 if identity in seen:continue
 seen.add(identity)
 url=b['url'].split('#')[0]+'#summary'
 state={'vehicle':'explorer','explorerColor':color,'explorerDrive':drive,'explorerWheels':wheel} if trim=='active' else {'engine':'ecoboost' if trim.startswith('ecoboost') else 'v8','body':'convertible' if trim.endswith('convertible') else 'fastback','color':color,'transmission':trans,'wheels':wheel}
 wheelinfo=catalogs[trim]['wheels'][wheel]
 interior=('Dark Space Gray cloth · second-row captain’s chairs' if wheel=='standard' else 'Active Comfort Package; review included interior equipment on Ford.com') if trim=='active' else ('Black Onyx cloth seats' if trim=='gtfastback' else 'Black Onyx ActiveX seats')
 builds.append({'id':'-'.join(identity),'model':models[trim],'trim':trim,'interior':interior,'equipment':wheelinfo['label']+'. '+wheelinfo['note'],'state':state,'url':url})
for trim,catalog in catalogs.items():
 covered={b['state'].get('explorerWheels',b['state'].get('wheels')) for b in builds if b['trim']==trim}
 for key,item in catalog['wheels'].items():item['verified']=key in covered
(root/'public/expanded-ford-catalog.js').write_text('// Ford browser-captured options and exact configuration links. Regenerate with scripts/build-ford-catalog.py.\nexport const fordCatalog='+json.dumps(catalogs,ensure_ascii=False,separators=(',',':'))+';\nexport const expandedBuilds='+json.dumps(builds,ensure_ascii=False,separators=(',',':'))+';\nexport function mustangTrim(draft){return draft.engine===\'ecoboost\'?(draft.body===\'convertible\'?\'ecoboostpremiumconvertible\':\'ecoboostpremiumfastback\'):(draft.body===\'convertible\'?\'gtpremiumconvertible\':\'gtfastback\');}\n')
(root/'public/ford-colors.css').write_text('\n'.join(css)+'\n')
print(len(builds),'captured builds; wheel counts', {t:len(c['wheels']) for t,c in catalogs.items()})
