"""Add parseBody + Zod schema import to each route file.
Run from tpv-restaturante directory: python3 add_parse_body.py
"""
import os, re
from collections import Counter

routes_dir = 'app/api'

# Map route relative path → schema name
schema_map = {
    'access-logs': 'AccessLogQuery',
    'add-stock': 'AddStockBody',
    'albaranes': 'AlbaranBody',
    'auto-order-settings': 'AutoOrderSettingsBody',
    'buffet': 'BuffetBody',
    'cancelled': 'CancelOrderBody',
    'catalog': 'CatalogBody',
    'catalog/csv': 'CatalogProductBody',
    'clockin': 'ClockinBody',
    'closures': 'ClosureBody',
    'combos': 'CombosBody',
    'delivery-zones': 'DeliveryZoneBody',
    'delivery/orders': 'DeliveryOrderBody',
    'delivery/runners': 'DeliveryRunnerBody',
    'delivery/tracking': 'DeliveryTrackingBody',
    'employees': 'EmployeePutBody',
    'gestoria': 'GestoriaBody',
    'kds': 'KdsBody',
    'kds/audit': 'KdsAuditBody',
    'meal-menus': 'MealMenuBody',
    'migrate': 'MigrateBody',
    'modifiers': 'ModifiersBody',
    'move-stock': 'MoveStockBody',
    'offers': 'OffersBody',
    'price-rules': 'PriceRulesBody',
    'production': 'ProductionBody',
    'purchase-orders': 'PurchaseOrderBody',
    'qr-calls': 'QrCallBody',
    'qr-order': 'QrOrderPostBody',
    'recipes': 'RecipeBody',
    'reservations': 'ReservationPostBody',
    'reset-orders': 'ResetOrdersBody',
    'sales': 'SalePostBody',
    'sales/refund': 'RefundBody',
    'session': 'SessionBody',
    'settings': 'SettingsBody',
    'shifts': 'ShiftBody',
    'split-stock': 'SplitStockBody',
    'stock-log': 'StockLogBody',
    'stripe/payment-intent': 'PaymentIntentBody',
    'stripe/terminal-payment-intent': 'TerminalPaymentIntentBody',
    'stripe/webhook-events': 'WebhookEventResetBody',
    'suppliers': 'SupplierBody',
    'supplier-catalog': 'SupplierCatalogPostBody',
    'supplier-price-history': 'SupplierPriceHistoryBody',
    'tenants': 'TenantPostBody',
    'time-off-requests': 'TimeOffBody',
    'turns': 'TurnBody',
    'verifactu': 'VerifactuBody',
    'verifactu/regenerate': 'VerifactuRegenerateBody',
    'verifactu/setup': 'VerifactuSetupBody',
    'verifactu/verify': 'VerifactuVerifyBody',
    'waitlist': 'WaitlistBody',
}

def get_import_prefix(content):
    """Determine the correct relative path prefix from file to project root."""
    lib_imports = re.findall(r"from '((?:\.\./)+)lib/", content)
    if lib_imports:
        # Use the longest prefix (deepest) to be safe
        return max(lib_imports, key=len)
    return '../../../lib/'  # default fallback

def add_imports(content, schema_name, prefix):
    """Add parseBody and schema imports after the last existing import."""
    # Check if already added
    if 'parseBody' in content:
        return content, False
    
    validate_import = f"import {{ parseBody }} from '{prefix}lib/infrastructure/validate';"
    schema_import = f"import {{ {schema_name} }} from '{prefix}lib/schemas/api-schemas';"
    new_imports = f"\n{validate_import}\n{schema_import}\n"
    
    # Insert after last import line
    lines = content.split('\n')
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.strip().startswith('import '):
            last_import_idx = i
    
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, new_imports)
        content = '\n'.join(lines)
    else:
        content = new_imports + '\n' + content
    
    return content, True

def replace_json(content, schema_name):
    """Replace req.json() patterns with parseBody."""
    original = content
    
    # Pattern 1: `const { a, b } = await req.json() as any;`
    content = re.sub(
        r'const \{ ([^}]+) \} = await req\.json\(\) as any;',
        lambda m: f'const {{ {m.group(1)} }} = await parseBody(req, {schema_name});',
        content
    )
    
    # Pattern 2: `const { a, b } = await req.json();`
    content = re.sub(
        r'const \{ ([^}]+) \} = await req\.json\(\);',
        lambda m: f'const {{ {m.group(1)} }} = await parseBody(req, {schema_name});',
        content
    )
    
    # Pattern 3: `const X = await req.json() as any;`
    content = re.sub(
        r'const (\w+) = await req\.json\(\) as any;',
        lambda m: f'const {m.group(1)} = await parseBody(req, {schema_name});',
        content
    )
    
    # Pattern 4: `const X = await req.json();`
    content = re.sub(
        r'const (\w+) = await req\.json\(\);',
        lambda m: f'const {m.group(1)} = await parseBody(req, {schema_name});',
        content
    )
    
    return content, content != original

def handle_special_cases(filepath, content, schema_name, prefix):
    """Handle routes with special body parsing patterns."""
    basename = os.path.basename(os.path.dirname(filepath))
    
    if basename == 'employees':
        # PUT uses EmployeePutBody (array), POST uses EmployeePostBody (object with action)
        # We need both schemas imported
        if 'parseBody' not in content:
            validate_import = f"import {{ parseBody }} from '{prefix}lib/infrastructure/validate';"
            schema_import = f"import {{ EmployeePutBody, EmployeePostBody }} from '{prefix}lib/schemas/api-schemas';"
            new_imports = f"\n{validate_import}\n{schema_import}\n"
            lines = content.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                if line.strip().startswith('import '):
                    last_import_idx = i
            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, new_imports)
                content = '\n'.join(lines)
        
        # Replace PUT method body (array of employees)
        content = re.sub(
            r'const (\w+) = await req\.json\(\) as any\[\];',
            lambda m: f'const {m.group(1)} = await parseBody(req, EmployeePutBody);',
            content
        )
        # Replace POST method body (object with action)
        content = re.sub(
            r'(?<!put)const (\w+) = await req\.json\(\) as any;',
            lambda m: f'const {m.group(1)} = await parseBody(req, EmployeePostBody);',
            content
        )
        return content, True
    
    if basename == 'floor':
        # Already has PUT with parseBody + FloorPutBodySchema
        # PATCH needs FloorPatchBody
        if 'FloorPatchBody' not in content:
            validate_import = f"import {{ parseBody }} from '{prefix}lib/infrastructure/validate';"
            schema_import = f"import {{ FloorPatchBody }} from '{prefix}lib/schemas/api-schemas';"
            content += f"\n{validate_import}\n{schema_import}\n"
        content = content.replace(
            "const body = await req.json() as {",
            "const { updatedTables, deletedTableIds, updatedOrders, deletedOrderIds } = await parseBody(req, FloorPatchBody) as "
        )
        # Fix the malformed line
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'FloorPatchBody) as' in line:
                # Remove the type assertion on the next lines until };
                j = i + 1
                while j < len(lines):
                    if '};' in lines[j]:
                        lines[j] = ''
                        break
                    lines[j] = ''
                    j += 1
                break
        content = '\n'.join(lines)
        return content, True
    
    if basename == 'tenants':
        # POST uses TenantPostBody, PUT uses TenantPutBody
        if 'parseBody' not in content:
            validate_import = f"import {{ parseBody }} from '{prefix}lib/infrastructure/validate';"
            schema_import = f"import {{ TenantPostBody, TenantPutBody }} from '{prefix}lib/schemas/api-schemas';"
            new_imports = f"\n{validate_import}\n{schema_import}\n"
            lines = content.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                if line.strip().startswith('import '):
                    last_import_idx = i
            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, new_imports)
                content = '\n'.join(lines)
        
        # Both use `const body = await req.json() as any;`
        # We need to differentiate: first occurrence is POST, second is PUT
        count = [0]
        def replacer(m):
            count[0] += 1
            if count[0] == 1:
                return f'const {m.group(1)} = await parseBody(req, TenantPostBody);'
            return f'const {m.group(1)} = await parseBody(req, TenantPutBody);'
        
        content = re.sub(
            r'const (\w+) = await req\.json\(\) as any;',
            replacer,
            content
        )
        return content, True
    
    if basename == 'sales':
        # POST uses SalePostBody, PATCH might also
        content = re.sub(
            r'const (\w+) = await req\.json\(\) as any;',
            lambda m: f'const {m.group(1)} = await parseBody(req, SalePostBody);',
            content
        )
        content = re.sub(
            r'const (\w+) = await req\.json\(\) as \{ saleId: string; payments: unknown \};',
            lambda m: f'const {m.group(1)} = await parseBody(req, SalePostBody);',
            content
        )
        return content, True
    
    if basename == 'verifactu/setup' or basename == 'setup':
        # Has `.catch(() => ({}))` pattern
        content = re.sub(
            r'const (\w+) = await req\.json\(\)\.catch\(\(\) => \(\{\}\)\) as Record<string, unknown>;',
            f'const \\1 = await parseBody(req, {schema_name}).catch(() => ({{}}));',
            content
        )
        return content, True
    
    return None, False

stats = {'processed': 0, 'skipped': 0, 'errors': 0}

for root, dirs, files in os.walk(routes_dir):
    for fn in files:
        if fn != 'route.ts':
            continue
        filepath = os.path.join(root, fn)
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Already has parseBody?
        if 'parseBody' in content:
            stats['skipped'] += 1
            print(f"SKIP (has parseBody): {filepath}")
            continue
        
        # Determine schema name
        rel = os.path.relpath(filepath, routes_dir).replace('\\', '/').replace('/route.ts', '')
        schema_name = schema_map.get(rel)
        if not schema_name:
            stats['skipped'] += 1
            print(f"SKIP (no schema): {filepath} ({rel})")
            continue
        
        prefix = get_import_prefix(content)
        
        # Try special cases first
        special_result = handle_special_cases(filepath, content, schema_name, prefix)
        if special_result and special_result[0] is not None:
            content, modified = special_result
            if modified:
                with open(filepath, 'w') as f:
                    f.write(content)
                stats['processed'] += 1
                print(f"OK (special): {filepath} → {schema_name}")
            continue
        
        # Standard handling
        content, imod = add_imports(content, schema_name, prefix)
        content, rmod = replace_json(content, schema_name)
        
        if imod or rmod:
            with open(filepath, 'w') as f:
                f.write(content)
            stats['processed'] += 1
            status = "imports+replace" if (imod and rmod) else ("imports" if imod else "replace")
            print(f"OK: {filepath} → {schema_name} ({status})")
        else:
            stats['skipped'] += 1
            print(f"SKIP (no changes): {filepath}")

print(f"\nDone: {stats['processed']} processed, {stats['skipped']} skipped, {stats['errors']} errors")
