#!/bin/bash
# usage: test/intake.sh BASE_URL  -> posts sample menu+logo as a public /start submission
python3 - "$1" <<'PY'
import sys,json,base64,urllib.request
d=lambda p,t:'data:%s;base64,'%t+base64.b64encode(open(p,'rb').read()).decode()
b={"name":"Sample Taco Test","email":"menusnap-test@example.com","phone":"555-0100","city":"Austin, TX","address":"1 Test St","hours":"11-9","menuImages":[d('test/sample-menu.jpg','image/jpeg')],"logo":d('test/sample-logo.png','image/png')}
r=urllib.request.Request(sys.argv[1]+'/api/intake',json.dumps(b).encode(),{'Content-Type':'application/json','Origin':sys.argv[1]})
print(urllib.request.urlopen(r).read().decode())
PY
