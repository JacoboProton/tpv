"""Add .passthrough() to all z.object() schemas that don't have it."""
import re

f = 'lib/schemas/api-schemas.ts'
c = open(f, encoding='utf-8').read()

# Strategy: walk through char by char, track z.object positions
# For each z.object({...}), find the matching closing }), 
# then check if .passthrough() follows

# Simple line-based: find lines that end z.object blocks
# These end with `})` or `}),` or `}])` etc
# and the following line doesn't have .passthrough()

lines = c.split('\n')
output = []
obj_depth = 0
in_object = False
obj_end_line = -1

for i, line in enumerate(lines):
    stripped = line.strip()
    
    if 'z.object({' in stripped:
        in_object = True
        obj_depth = stripped.count('{') - stripped.count('}')
        if obj_depth == 0:
            # z.object({}) on one line - check if passthrough follows
            pass
        output.append(line)
        continue
    
    if in_object:
        obj_depth += stripped.count('{') - stripped.count('}')
        if obj_depth <= 0:
            in_object = False
            # This line closes the z.object
            # Check if next non-empty line has .passthrough()
            if not stripped.endswith('.passthrough()') and '.passthrough()' not in stripped:
                # Add .passthrough() after the closing }) or }))
                # Find the last }) or )) to add before it
                # Actually, just append it to the line
                if stripped.endswith(','):
                    output.append(stripped)
                elif stripped.endswith('.passthrough()'):
                    output.append(line)
                    continue
                else:
                    # Add .passthrough() after the closing
                    output.append(line + ' .passthrough()')
                    continue
    output.append(line)

c2 = '\n'.join(output)
# Also fix the broken ones from the simple fix
c2 = c2.replace('} .passthrough()', '}).passthrough()')
c2 = c2.replace('}) .passthrough()', '}).passthrough()')
c2 = c2.replace('}} .passthrough()', '}}).passthrough()')
c2 = c2.replace('}]) .passthrough()', '}]).passthrough()')

open(f, 'w', encoding='utf-8').write(c2)
print('Done')
