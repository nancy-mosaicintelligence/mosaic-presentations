# Builds the v2 deck: the keynote deck, unchanged, with the film layered over its stage from station 3 on.
import json,base64,sys
import os; os.chdir(os.path.dirname(os.path.abspath(__file__))); SRC='../../../index.html'; OUT=sys.argv[1] if len(sys.argv)>1 else '../index.html'
d=open(SRC).read()
TLj=json.load(open('timeline.json'))
TL={'dur':TLj['dur'],'segs':[{'id':s['id'],'start':s['start'],'dur':s['dur'],'words':s['words']} for s in TLj['segs']]}
data=open('data.js').read().replace('getElementById("tunsvg")','getElementById("filmtunsvg")').replace('id:"wsclip"','id:"fwsclip"').replace('url(#wsclip)','url(#fwsclip)').replace('id:"grn"','id:"fgrn"').replace('url(#grn)','url(#fgrn)')
scenes=open('scenes.js').read().replace("holder.id = 'tunsvg'","holder.id = 'filmtunsvg'")
lib=open('lib.js').read()
uri=lambda f:'data:image/jpeg;base64,'+base64.b64encode(open(f,'rb').read()).decode()
glue=open('glue2.js').read().replace('__TL__',json.dumps(TL)).replace('__IMGA__',json.dumps(uri('img/tun.7.jpg'))).replace('__IMGB__',json.dumps(uri('img/tun.8.jpg')))
bundle='\n<script>/* the v2 deck: station-driven scenes drawn over the stage */\n(function(){\n'+data+'\n'+open('ico.js').read()+'\n'+lib+'\n'+scenes+'\n'+open('v2.js').read()+'\n'+glue+'\n})();\n</script>\n'
css='<style>#film{position:fixed;inset:0;width:100%;height:100%;z-index:10;pointer-events:none;visibility:hidden;opacity:0}</style>\n'
assert d.count('</head>')==1 and d.count('<canvas id="fx"></canvas>')==1
d=d.replace('</head>',css+'</head>',1).replace('<canvas id="fx"></canvas>','<canvas id="fx"></canvas><canvas id="film" aria-hidden="true"></canvas>',1)
hook='function frame(now) {\n    requestAnimationFrame(frame);'
assert d.count(hook)==1
d=d.replace(hook,hook+'\n    window.__itwStep = step;',1)
i=d.rfind('</body>'); d=d[:i]+bundle+d[i:]
open(OUT,'w').write(d); print('wrote',OUT,len(d))
