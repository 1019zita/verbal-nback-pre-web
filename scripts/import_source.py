"""Import only Verbal N-BACK_pre; preserve source tables and decoded RGB pixels."""
from pathlib import Path
import hashlib
import json
import re
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parents[1] / 'n-back' / '言语N-back'
SOURCE_FILE = SOURCE / 'N-BACK_pre.es'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def parse(path):
    objects, section = [], None
    for ln, line in enumerate(path.read_text(encoding='utf-8-sig').splitlines(), 1):
        if re.fullmatch(r'\[[^\]]+\]', line):
            section = {'section': line[1:-1], 'line': ln, 'props': {}, 'lines': {}}
            objects.append(section)
        elif section is not None and '=' in line:
            key, val = line.split('=', 1)
            section['props'][key] = val[1:-1] if val.startswith('"') and val.endswith('"') else val
            section['lines'][key] = ln
    return objects

def build_standalone(config):
    """Bundle the runtime and embedded config for file:// double-click use."""
    parts = ["'use strict';", 'globalThis.EXPERIMENT_CONFIG = ' + json.dumps(config, ensure_ascii=False, separators=(',', ':')) + ';']
    for relative in ('src/core.js', 'src/storage.js', 'src/app.js'):
        source = (ROOT / relative).read_text(encoding='utf8')
        source = re.sub(r'^import .*?;\s*$', '', source, flags=re.MULTILINE)
        source = re.sub(r'^export\s+', '', source, flags=re.MULTILINE)
        parts.append(source.strip())
    (ROOT / 'standalone.js').write_text('\n\n'.join(parts) + '\n', encoding='utf8')

def main():
    objects = parse(SOURCE_FILE)
    names = {o['props']['Name']: o for o in objects if 'Name' in o['props']}
    for folder in ('data', 'assets', 'source'):
        (ROOT / folder).mkdir(exist_ok=True)
    text_screens = {
        'instruction': {
            'title': '欢迎参加我们的实验！',
            'paragraphs': [
                '在接下来的实验过程中，屏幕上会出现不同的汉字，要求你判断当前\n汉字的读音是否与该汉字向前倒数第n个出现的汉字的读音一致。',
                '认为一致按“Z”键，认为不一致按“/”键',
                '实验过程中，汉字只短暂呈现，请集中注意力，尽可能快而准地做出反应',
            ],
            'prompt': '如果你已经熟悉规则，请按 空格键 继续',
        },
        'cueone': {
            'title': '1 back',
            'paragraphs': [
                '第一个出现的汉字不做反应，从第二个汉字开始。依次判断当前\n的汉字的读音与该汉字向前倒数一个汉字的读音是否一致。',
                '认为一致按“Z”键，认为不一致按“/”键',
            ],
            'prompt': '如果你熟悉规则，请按 空格键 继续',
        },
        'cuetwo': {
            'title': '2 back',
            'paragraphs': [
                '前二个出现的汉字不做反应，从第三个汉字开始。依次判断当前\n的汉字读音与该汉字向前倒数二个汉字的读音是否一致。',
                '认为一致按“Z”键，认为不一致按“/”键',
            ],
            'prompt': '如果你熟悉规则，请按 空格键 继续',
        },
        'cuethree': {
            'title': '3 back',
            'paragraphs': [
                '前三个出现的汉字不做反应，从第四个汉字开始。依次判断当前\n汉字读音与该汉字向前倒数三个汉字的读音是否一致。',
                '认为一致按“Z”键，认为不一致按“/”键',
            ],
            'prompt': '如果你熟悉规则，请按 空格键 继续',
        },
        'rest': {'title': '', 'paragraphs': ['请休息一会，休息好了请按 空格键 继续'], 'prompt': ''},
        'ImageDisplay1': {'title': '实验结束，谢谢参与', 'paragraphs': [], 'prompt': '（按任意键完成）'},
    }
    key_map = {'': '', 'j': 'z', 'f': '/'}
    blocks = []
    used = set()
    for n, name, cue in ((1, 'oneback', 'cueone'), (3, 'threeback', 'cuethree'), (2, 'twoback', 'cuetwo')):
        obj = names[name]
        rows = []
        for i in range(1, int(obj['props']['Levels']) + 1):
            field = f'Levels({i}).ValueString'
            cols = obj['props'][field].split(r'\t')
            assert cols[:3] == ['1', '', 'trialproc']
            used.add(cols[3])
            rows.append({'trial': i, 'stimulus': cols[3], 'source_answer': cols[4], 'expected_key': key_map[cols[4]], 'source_line': obj['lines'][field]})
        assert len(rows) == 72 + n
        assert [r['source_answer'] for r in rows[:n]] == [''] * n
        assert all(r['source_answer'] in ('f', 'j') for r in rows[n:])
        blocks.append({'n': n, 'list': name, 'procedure': {1:'procA', 2:'procE', 3:'procC'}[n], 'cue': names[cue]['props']['Filename'], 'trials': rows})
    screens = {}
    for name in ('instruction', 'cueone', 'cuetwo', 'cuethree', 'rest', 'ImageDisplay1', 'ImageDisplay2'):
        p = names[name]['props']
        screens[name] = {'filename': p['Filename'], 'stretch': p['Stretch'] == 'Yes', 'background': p['BackColor'], 'duration': int(p['Duration'])}
        if name not in text_screens and not p['Filename'].startswith('['):
            used.add(p['Filename'])
    assets = []
    for name in sorted(used):
        original = SOURCE / name
        target = ROOT / 'assets' / Path(name).with_suffix('.png').name
        with Image.open(original) as im:
            rgb = im.convert('RGB')
            rgb.save(target, optimize=True)
            with Image.open(target) as saved:
                assert rgb.size == saved.size and rgb.tobytes() == saved.convert('RGB').tobytes()
            assets.append({'source_name': name, 'url': 'assets/' + target.name, 'width': rgb.width, 'height': rgb.height, 'source_sha256': digest(original), 'png_sha256': digest(target), 'rgb_sha256': hashlib.sha256(rgb.tobytes()).hexdigest()})
    version = (ROOT / 'VERSION').read_text(encoding='utf8').strip()
    config = {'experiment': 'Verbal_N_BACK_pre', 'version': version, 'source_file': '言语N-back/N-BACK_pre.es', 'source_sha256': digest(SOURCE_FILE), 'frame': {'width':1024,'height':768}, 'timing': {'stimulus_ms':500,'blank_ms':2000,'stimulus_input_ms':2500}, 'screens': screens, 'text_screens': text_screens, 'blocks':blocks, 'assets':assets, 'known_issues':['web_key_mapping_differs_from_source_fj','text_screens_replace_source_bitmaps','eprime_overlap_behavior_not_empirically_verified','browser_display_requires_researcher_acceptance']}
    (ROOT/'data'/'experiment.json').write_text(json.dumps(config, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    build_standalone(config)
    for ext in ('.es', '.ebs'):
        shutil.copyfile(SOURCE / ('N-BACK_pre'+ext), ROOT/'source'/('N-BACK_pre'+ext))
    (ROOT/'source'/'manifest.json').write_text(json.dumps({'original_directory':'n-back/言语N-back','files':{name:digest(SOURCE/name) for name in ['N-BACK_pre.es','N-BACK_pre.ebs']},'runtime_asset_count':len(assets),'standalone_sha256':digest(ROOT/'standalone.js'),'lossless_rgb_verified':True},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps({'blocks':[len(b['trials']) for b in blocks],'trials':sum(len(b['trials']) for b in blocks),'assets':len(assets),'standalone':True,'lossless_pixels_verified':True}))

if __name__ == '__main__':
    main()
