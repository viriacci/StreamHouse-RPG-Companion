#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
import re
import json
import shutil
import subprocess
import sys

ROOT=Path(__file__).resolve().parent.parent
FILES=[
    'admin/index.html',
    'admin/admin.css',
    'admin/admin.js',
    'control-center/projects.example.json',
    'supabase/migrations/20261116090000_streamhouse_admin_console.sql',
    'scripts/deploy-staging.sh'
]

class Scanner(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references=[]
    def handle_starttag(self, tag, attrs):
        attributes=dict(attrs)
        if tag in ('script','link'):
            for name in ('src','href'):
                if name in attributes:
                    self.references.append(attributes[name])

def check():
    errors=[]
    for path in FILES:
        if not (ROOT/path).is_file():
            errors.append('Brak pliku: '+path)
    if errors:
        return errors

    html=(ROOT/'admin/index.html').read_text(encoding='utf-8')
    javascript=(ROOT/'admin/admin.js').read_text(encoding='utf-8')
    registry=json.loads((ROOT/'control-center/projects.example.json').read_text(encoding='utf-8'))
    if registry.get('schema_version')!=1 or registry.get('control_center',{}).get('control_plane_host')!='mikrus':
        errors.append('Niepoprawny rejestr lub brak Mikrusa jako centrum')
    if registry.get('control_center',{}).get('deployments_enabled') is not False:
        errors.append('Publikacje w katalogu muszą być wyłączone')
    hosts={host.get('id') for host in registry.get('hosts',[])}
    projects=registry.get('projects',[])
    if len(projects)<2 or len({p.get('id') for p in projects})!=len(projects):
        errors.append('Brak niezależnych projektów lub zduplikowane ID')
    for project in projects:
        if project.get('data_policy')!='project-isolated':
            errors.append('Brak izolacji danych: '+str(project.get('id')))
        for env_name in ('production','staging'):
            env=project.get(env_name,{})
            if env.get('publish_enabled') is not False:
                errors.append('Niebezpieczna flaga publikacji: '+str(project.get('id')))
            if env.get('host_id') not in hosts:
                errors.append('Nieznany host: '+str(project.get('id')))
    if '../control-center/projects.example.json' not in javascript:
        errors.append('Panel nie korzysta z rejestru projektów')

    sql=(ROOT/'supabase/migrations/20261116090000_streamhouse_admin_console.sql').read_text(encoding='utf-8').lower()
    deploy=(ROOT/'scripts/deploy-staging.sh').read_text(encoding='utf-8')
    scan=Scanner();scan.feed(html)
    for ref in scan.references:
        if ref.startswith(('https:','http:','data:')):
            continue
        target=(ROOT/'admin'/ref.split('?')[0]).resolve()
        if not target.is_relative_to(ROOT.resolve()) or not target.is_file():
            errors.append('Nieistniejący odnośnik admin: '+ref)

    if 'window.STREAMHOUSE_ADMIN_ENV' not in javascript:
        errors.append('Brakuje blokady dostępu do środowiska staging')
    if 'window.STREAMHOUSE_ADMIN_DEMO===true' not in javascript:
        errors.append('Brakuje jawnego trybu demo')
    if 'navigator.serviceWorker' in javascript:
        errors.append('Brak zgody na service worker w adminie staging')

    required_rpcs=[
        'sh_admin_access','sh_admin_metrics','sh_admin_users',
        'sh_admin_campaigns','sh_admin_members','sh_admin_activity',
        'sh_admin_archive_campaign','sh_admin_remove_player','sh_admin_set_moderator'
    ]
    for rpc in required_rpcs:
        if rpc not in sql or rpc not in javascript:
            errors.append('Niekompletna funkcja RPC: '+rpc)

    if 'security definer set search_path=' not in sql:
        errors.append('Funkcje muszą pinować search_path')
    if 'from public.sh_direct_messages' not in sql or 'count(*)' not in sql:
        errors.append('Metryka wiadomości nie jest ograniczona do liczby')
    for name in ('private.sh_admin_roles','private.sh_admin_audit'):
        if 'revoke all on '+name+' from public,anon,authenticated;' not in sql:
            errors.append('Brakuje blokady tabeli: '+name)

    for role in required_rpcs:
        if 'revoke all on function public.'+role not in sql:
            errors.append('Brak REVOKE na RPC: '+role)

    for expected in ('127.0.0.1','/var/www/streamhouse-staging','STREAMHOUSE_STAGING_PROJECT_REF',
                     'STREAMHOUSE_ADMIN_DEMO=true','PROD_PROJECT_REF='):
        if expected not in deploy:
            errors.append('Skrypt stagingu nie spełnia wymogu: '+expected)

    if re.search(r"sb_secret_[A-Za-z0-9_-]+",javascript):
        errors.append('Wykryto klucz sekretowy w JS')
    if shutil.which('node'):
        result=subprocess.run(['node','--check',str(ROOT/'admin/admin.js')],capture_output=True,text=True)
        if result.returncode:
            errors.append('Błąd składni JavaScript: '+result.stderr[:500])
    result=subprocess.run(['bash','-n',str(ROOT/'scripts/deploy-staging.sh')],capture_output=True,text=True)
    if result.returncode:
        errors.append('Błąd składni skryptu staging: '+result.stderr[:500])
    return errors

def main():
    failures=check()
    if failures:
        print('\n'.join(failures),file=sys.stderr)
        return 1
    print('OK: panel admina, backend RPC, odnośniki, izolacja staging, JavaScript oraz Bash.')
    return 0

if __name__=='__main__':
    sys.exit(main())
