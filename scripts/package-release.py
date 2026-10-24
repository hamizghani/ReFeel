"""Package the root-level V3.1 Vercel project and verify every archived member."""
from pathlib import Path
import hashlib, json, zipfile, os
ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT.parent / 'v3.1-deliverables'
OUTPUT.mkdir(exist_ok=True)
ARCHIVE = 'Familiar_V3.1_Vercel_Deployable.zip'
EXCLUDE = {'node_modules', '.git', '.vite', '__pycache__'}

def eligible(p):
    rel = p.relative_to(ROOT)
    return (p.is_file() and p.name != 'RELEASE_MANIFEST.json'
        and not any(part in EXCLUDE or part.startswith('.') for part in rel.parts)
        and not p.name.endswith(('.tmp', '.tsbuildinfo', '.partial'))
        and not p.name.startswith('failure-')
        and not (rel.as_posix().startswith('qa/') and (not rel.as_posix().startswith('qa/evidence/') or p.suffix in {'.png','.webm','.mp4'}))
        and not rel.as_posix().startswith(('qa/current/', 'qa/current-studio/', 'references/normalized/','reference-pack/legacy-v1-qa/','reference-pack/legacy-v2-qa/','docs/superpowers/plans/')))

files = sorted(p for p in ROOT.rglob('*') if eligible(p))
manifest = {'product': 'Familiar', 'version': '3.1.0', 'archive': ARCHIVE,
    'applicationRoot': 'archive root', 'runtime': 'Photographic marketplace with one illustrative animated cloth garment; browser-local prototype',
    'files': [{'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size,
               'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
manifest_bytes = (json.dumps(manifest, indent=2) + '\n').encode()
target = OUTPUT / ARCHIVE
temporary = OUTPUT / (ARCHIVE + '.partial')
with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as z:
    for p in files:
        z.write(p, p.relative_to(ROOT).as_posix(), compress_type=zipfile.ZIP_STORED if p.suffix == '.zip' else zipfile.ZIP_DEFLATED)
    z.writestr('RELEASE_MANIFEST.json', manifest_bytes)
with temporary.open('rb') as handle:
    os.fsync(handle.fileno())
os.replace(temporary, target)
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None, 'ZIP CRC'
    names = z.namelist()
    assert len(names) == len(set(names)), 'Unique archive members'
    stored = json.loads(z.read('RELEASE_MANIFEST.json'))
    assert stored['archive'] == ARCHIVE and stored['version'] == '3.1.0'
    assert set(names) == {e['path'] for e in stored['files']} | {'RELEASE_MANIFEST.json'}, 'Exact manifest membership'
    for entry in stored['files']:
        data = z.read(entry['path'])
        assert len(data) == entry['bytes'], entry['path']
        assert hashlib.sha256(data).hexdigest() == entry['sha256'], entry['path']
    for name in ['package.json','package-lock.json','vercel.json','index.html','tsconfig.json',
                 'src/App.tsx','src/domain.ts','src/MarketplacePages.tsx','src/ProductPages.tsx',
                 'src/StudioPages.tsx','src/FeelPages.tsx','src/CommercePages.tsx','src/media.ts',
                 'public/photos/manifest.json','public/models/cloud-animated.glb','public/models/manifest.json','dist/models/cloud-animated.glb','dist/index.html','qa/evidence/browser-results.json','qa/evidence/studio-browser-results.json','docs/CLOTH_PHYSICS.md','src/cloth/physics.ts','src/components/AnimatedGarment.tsx',
                 'README.md','src/SellerPage.tsx','src/sellers.ts','public/covers/manifest.json','docs/REVISION_V3_1.md','reference-pack/current-design/DESIGN_GUIDELINE.md']:
        assert name in names, name
    assert not any('node_modules' in Path(n).parts or n.startswith('/') or '..' in Path(n).parts for n in names)
    assert [n for n in names if n.startswith('public/models/') and n.endswith('.glb')] == ['public/models/cloud-animated.glb'], 'One source base model'
    assert [n for n in names if n.startswith('dist/models/') and n.endswith('.glb')] == ['dist/models/cloud-animated.glb'], 'One deployed base model'
    assert z.read('public/models/cloud-animated.glb') == z.read('dist/models/cloud-animated.glb')
    assert json.loads(z.read('package.json'))['dependencies']['three'] == '0.180.0'
    browser = json.loads(z.read('qa/evidence/browser-results.json'))
    studio = json.loads(z.read('qa/evidence/studio-browser-results.json'))
    units = json.loads(z.read('qa/evidence/unit-results.json'))
    assert browser['mode'] == 'production' and len(browser['results']) == 24
    assert all(e['status'] == 'passed' for e in browser['results']) and not browser['pageErrors']
    assert len(browser['accessibility']) == 22 and all(not e['violations'] for e in browser['accessibility'])
    assert studio['mode'] == 'production' and len(studio['results']) == 13
    assert all(e['status'] == 'passed' for e in studio['results']) and not studio['pageErrors']
    assert units['success'] and units['numPassedTests'] == units['numTotalTests'] and units['numTotalTests'] >= 216
    for report_name, minimum in [('navigation-browser-results.json', 3), ('shopping-results.json', 8), ('match-disclosure-results.json', 4)]:
        current = json.loads(z.read('qa/evidence/' + report_name))
        assert len(current['results']) >= minimum, report_name
        assert all(item['status'] == 'passed' for item in current['results']), report_name
        assert not current.get('pageErrors', []), report_name
    covers = json.loads(z.read('public/covers/manifest.json'))
    assert len(covers['items']) >= 12
    for item in covers['items']:
        source = 'public' + item['src']
        assert source in names and 'dist' + item['src'] in names, source
        assert z.read(source) == z.read('dist' + item['src']), source
report = {'archive': ARCHIVE, 'version': '3.1.0', 'bytes': target.stat().st_size,
    'entries': len(names), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    'rootProject': True, 'crcPassed': True, 'manifestMembershipAndHashesPassed': True}
(OUTPUT / 'release-integrity.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
