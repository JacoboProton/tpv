"""Add parseBody + Zod schema imports to all API route files."""
import os, re, ast

routes_dir = 'app/api'

# Route → (methods, schema_name) for POST/PUT/PATCH
route_schemas = {}

# Collect schemas defined in api-schemas.ts
schema_names = set()
for root, dirs, files in os.walk(routes_dir):
    for fn in files:
        if fn != 'route.ts':
            continue
        filepath = os.path.join(root, fn)
        with open(filepath) as f:
            content = f.read()
        
        # Find existing import from api-schemas to determine which schema to use
        m = re.search(r"import \{ ([^}]+) } from.*api-schemas", content)
        if m:
            for name in m.group(1).split(','):
                schema_names.add(name.strip())
        
        # Find existing imports from lib/ to determine depth
        lib_imports = re.findall(r"from '((?:\.\./)+)lib/", content)
        if lib_imports:
            from collections import Counter
            common_depth = Counter(lib_imports).most_common(1)[0][0]
        else:
            common_depth = None

print(f"Found {len(schema_names)} unique schema names in files")
print(f"Schemas: {sorted(schema_names)}")
