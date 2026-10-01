import re

path = "src/app/dashboard/grid/GridClient.tsx"
with open(path, "r") as f:
    code = f.read()

# 1. Remove outer wrapper
code = code.replace(
    '<div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">',
    '<div>'
)

# 2. Heading
code = code.replace(
    '<h1 className="text-xl sm:text-2xl font-bold" style={{ color: \'var(--text-primary)\' }}>\n            Grid Planner\n          </h1>',
    '<h1 className="page-heading">\n            Grid <em>planner</em>\n          </h1>'
)

# 3. Cards: replace style={cardStyle} with className="card"
code = re.sub(
    r'className="rounded-2xl ([^"]*)"(\s*)style=\{cardStyle\}',
    lambda m: 'className="card ' + re.sub(r'p-4 sm:p-5|p-4', 'p-6', m.group(1)).replace('rounded-2xl', '').strip() + '"',
    code
)
code = re.sub(
    r'className="([^"]*)"(\s*)style=\{\s*cardStyle\s*\}',
    lambda m: 'className="card ' + m.group(1).replace('rounded-2xl', '').strip() + '"',
    code
)
code = code.replace('style={cardStyle}', 'className="card"')

# 4. Card padding
code = code.replace('p-4 sm:p-5', 'p-6')

# 5. Primary buttons (New post link, Create first post link)
code = code.replace(
    'className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-white hover:opacity-90 transition-opacity shrink-0"\n          style={{ background: \'var(--accent)\' }}',
    'className="btn-primary flex items-center gap-2 shrink-0"'
)
code = code.replace(
    'className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white hover:opacity-90 transition-opacity"\n            style={{ background: \'var(--accent)\' }}',
    'className="btn-primary inline-flex items-center gap-2"'
)

with open(path, "w") as f:
    f.write(code)
print("GridClient.tsx updated")
