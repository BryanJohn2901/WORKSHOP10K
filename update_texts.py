import re

with open('index.html', 'r') as f:
    content = f.read()

def replacer(match):
    tag = match.group(0)
    tag = re.sub(r'\btext-(sm|lg|xl)\b', 'text-base', tag)
    tag = re.sub(r'\bmd:text-2xl\b', '', tag)
    return tag

content = re.sub(r'<(p|ul|li)\b[^>]*>', replacer, content)

# Also apply to the specific divs that act as text paragraphs
content = content.replace('text-white font-bold text-sm', 'text-white font-bold text-base')

with open('index.html', 'w') as f:
    f.write(content)
