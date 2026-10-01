import re

path = "src/app/dashboard/carousel/CarouselClient.tsx"
with open(path, "r") as f:
    code = f.read()

# 1. Remove outer wrapper padding and max-w
code = code.replace(
    '<div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">',
    '<div>'
)

# 2. Heading: page-heading with <em>
code = code.replace(
    '<h1 className="text-xl sm:text-2xl font-bold" style={{ color: \'var(--text-primary)\' }}>\n            Carousel Builder\n          </h1>',
    '<h1 className="page-heading">\n            Carousel <em>builder</em>\n          </h1>'
)

# 3. Cards: replace style={cardStyle} with className="card", handle existing classNames
# Pattern: className="..." style={cardStyle}
code = re.sub(
    r'className="rounded-2xl ([^"]*)"(\s*)style=\{cardStyle\}',
    lambda m: 'className="card ' + re.sub(r'p-4 sm:p-5|p-4', 'p-6', m.group(1)).replace('rounded-2xl', '').strip() + '"',
    code
)
# standalone style={cardStyle} with className
code = re.sub(
    r'className="([^"]*)"(\s*)style=\{\s*cardStyle\s*\}',
    lambda m: 'className="card ' + m.group(1).replace('rounded-2xl', '').strip() + '"',
    code
)
# style={{ ...cardStyle, ... }}
code = re.sub(
    r'style=\{\{\s*\.\.\.cardStyle,([^}]*)\}\}',
    r'className="card" style={{\1}}',
    code
)
# standalone style={cardStyle}
code = code.replace('style={cardStyle}', 'className="card"')

# 4. Card padding: p-4 sm:p-5 -> p-6 (remaining)
code = code.replace('p-4 sm:p-5', 'p-6')

# 5. Primary buttons: accent bg white text -> btn-primary
code = code.replace(
    'className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"\n            style={{ background: \'var(--accent)\' }}',
    'className="btn-primary w-full flex items-center justify-center gap-2"'
)
# Post carousel button
code = code.replace(
    'className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"\n                  style={{ background: \'var(--accent)\' }}',
    'className="btn-primary flex-1 flex items-center justify-center gap-2"'
)

# 6. Secondary buttons: bg border -> btn-secondary
code = code.replace(
    'className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:opacity-80 transition-opacity"\n                  style={{ background: \'var(--bg)\', border: \'1px solid var(--border)\', color: \'var(--text-primary)\' }}',
    'className="btn-secondary flex items-center justify-center gap-2"'
)
# Schedule button
code = code.replace(
    'className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap disabled:opacity-50 hover:opacity-80 transition-opacity"\n                  style={{ background: \'var(--bg)\', border: \'1px solid var(--border)\', color: \'var(--text-primary)\' }}',
    'className="btn-secondary flex items-center gap-2 whitespace-nowrap"'
)

with open(path, "w") as f:
    f.write(code)
print("CarouselClient.tsx updated")
