import json, subprocess, sys, time, os
from gtts import gTTS

SID = '1bg7wD_Vs43a1kSIOcM2vxSJq2q9WOUQ5H1Nd72otXj8'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio')
B64OUT = os.path.join(os.path.dirname(__file__), '..', 'audio-src')
os.makedirs(OUT, exist_ok=True)

def get_values(rng):
    r = subprocess.run(['/opt/hatch/bin/hatch_gws_cli','sheets','spreadsheets','values','get',
                        '--params', json.dumps({'spreadsheetId': SID, 'range': rng})],
                       capture_output=True, text=True)
    d = json.loads(r.stdout)
    return d.get('values') or d.get('result', {}).get('values', [])

jobs = []  # (filename, text)
for row in get_values('cards!A2:B100'):
    if len(row) >= 2 and row[0]:
        jobs.append((f"{row[0]}.mp3", row[1]))
for row in get_values('drills!A2:C100'):
    if len(row) >= 2 and row[0]:
        jobs.append((f"{row[0]}q.mp3", row[1]))
for row in get_values('drills!A2:E100'):
    pass
rows = get_values('drills!A2:F100')
for row in rows:
    if len(row) >= 4 and row[0]:
        jobs.append((f"{row[0]}a.mp3", row[3]))

print('jobs:', len(jobs))
done, failed = 0, []
for name, text in jobs:
    path = os.path.join(OUT, name)
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        done += 1
        continue
    try:
        gTTS(text=text, lang='zh-CN').save(path)
        done += 1
    except Exception as e:
        failed.append((name, text, str(e)[:100]))
    time.sleep(0.4)
print('done:', done, 'failed:', len(failed))

# リポジトリ格納用に Base64 化（push_files はテキストのみのため）
import base64
os.makedirs(B64OUT, exist_ok=True)
for name in sorted(os.listdir(OUT)):
    if name.endswith('.mp3'):
        data = open(os.path.join(OUT, name), 'rb').read()
        with open(os.path.join(B64OUT, name + '.b64'), 'w') as fh:
            fh.write(base64.encodebytes(data).decode())
print('b64 written:', len([f for f in os.listdir(B64OUT) if f.endswith('.b64')]))
for f in failed: print('FAILED', f)
