"""One category mapping for stacked areas and caption ratios."""
import csv

def load(root):
    rows=list(csv.DictReader((root/'data/engineering/code_size.csv').open()))
    # Older dev/test-fixture helper rows exist in the component catalogue but
    # no longer appear in its purpose rollup; retain them as apparatus tools.
    details=list(csv.DictReader((root/'data/engineering/code_size_files.csv').open()))
    # Report rows newer than the purpose rollup need an explicit destination.
    extras={'Measurement Rig (benchmark/)':'Tools',
            'DocAble-Editors/SharedView':'Frontend',
            'chunk-remediation-service':'Shared/services',
            'cli-backend':'Shared/services', 'checking-backend':'Shared/services',
            'verapdf-validator':'Shared/services'}
    by_week={r['project_week']:r for r in rows}
    for detail in details:
        if detail['category']!='(uncategorized)': continue
        name=detail['row']
        category=('Tools' if name.startswith(('Dev: ', 'Tools: ')) else
                  'Remediation' if name.startswith('Remediation: ') else extras.get(name))
        assert category is not None, f'Review newly uncategorized report row: {name}'
        row=by_week[detail['project_week']]
        row[category]=int(row.get(category,0))+int(detail['code'])
    groups={
        'production': [('Remediation','Core remediation'),('Web layer','Web processing'),('Frontend','Frontend'),('Shared/services','Shared/services')],
        'apparatus': [('Tests','Tests'),('Lints','Lints'),('Tools','Tools/helpers'),('Agent Infrastructure','Agent infra.'),('Infrastructure as Code','Infra. as code'),('System-model meta-files','Models'),('Documentation (code, load-bearing)','Indexed docs')],
    }
    return rows, groups
