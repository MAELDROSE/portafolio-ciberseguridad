"""Check local metadata structure and references without requiring an org."""
from pathlib import Path
import json
import re
import sys
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
base = root / 'force-app/main/default'
ns = {'m': 'http://soap.sforce.com/2006/04/metadata'}
errors = []
xml_files = list(base.rglob('*.xml'))
for file in xml_files:
    try:
        element = ET.parse(file).getroot()
        if not element.tag.startswith('{' + ns['m'] + '}'):
            errors.append(f'{file}: missing Salesforce namespace')
    except ET.ParseError as error:
        errors.append(f'{file}: {error}')
fields = {obj.name: {f.name.removesuffix('.field-meta.xml') for f in (obj / 'fields').glob('*.xml')} for obj in (base / 'objects').iterdir()}
classes = {p.stem for p in (base / 'classes').glob('*.cls')}
for file in [*(base / 'classes').glob('*.cls'), *(base / 'triggers').glob('*.trigger')]:
    if not Path(str(file) + '-meta.xml').exists():
        errors.append(f'Missing metadata descriptor: {file}')
for file in (base / 'permissionsets').glob('*.xml'):
    element = ET.parse(file).getroot()
    for access in element.findall('m:classAccesses/m:apexClass', ns):
        if access.text not in classes: errors.append(f'{file}: unknown class {access.text}')
    for field in element.findall('m:fieldPermissions/m:field', ns):
        obj, name = field.text.split('.')
        if name not in fields.get(obj, set()): errors.append(f'{file}: unknown field {field.text}')
    for access in element.findall('m:fieldPermissions', ns):
        field = access.findtext('m:field', namespaces=ns)
        if field.startswith('Claim_Event__c.') and access.findtext('m:editable', namespaces=ns) == 'true':
            errors.append(f'{file}: audit fields must not be editable')
    for access in element.findall('m:objectPermissions', ns):
        if access.findtext('m:allowDelete', namespaces=ns) == 'true': errors.append(f'{file}: deletion must not be granted')
for file in (base / 'lwc').rglob('*.js'):
    for cls in re.findall(r'@salesforce/apex/(\w+)\.', file.read_text()):
        if cls not in classes: errors.append(f'{file}: unknown controller {cls}')
project = json.loads((root / 'sfdx-project.json').read_text())
if project['sourceApiVersion'] != '62.0': errors.append('Review checks before changing API version')
for file in root.rglob('*.json'):
    if 'node_modules' not in file.parts and '.local' not in file.parts:
        try: json.loads(file.read_text())
        except Exception as error: errors.append(f'{file}: {error}')
print(f'Metadata: {len(xml_files)} XML files parsed; local class, field and permission references checked.')
print('Metadata API schema compatibility still requires an actual Salesforce deployment validation.')
for error in errors: print(error, file=sys.stderr)
sys.exit(bool(errors))
