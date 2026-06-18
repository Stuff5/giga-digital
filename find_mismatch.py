def clean_js(content):
    res = []
    i = 0
    in_str = False
    str_char = None
    in_line_comment = False
    in_multi_comment = False
    in_regex = False
    in_regex_class = False
    
    while i < len(content):
        # Handle line comments
        if in_line_comment:
            if content[i] == '\n':
                in_line_comment = False
                res.append('\n')
            else:
                res.append(' ')
            i += 1
            continue
            
        # Handle multiline comments
        if in_multi_comment:
            if content[i:i+2] == '*/':
                in_multi_comment = False
                res.append('  ')
                i += 2
            else:
                if content[i] == '\n':
                    res.append('\n')
                else:
                    res.append(' ')
                i += 1
            continue
            
        # Handle strings
        if in_str:
            if content[i] == str_char:
                escapes = 0
                k = i - 1
                while k >= 0 and content[k] == '\\':
                    escapes += 1
                    k -= 1
                if escapes % 2 == 0:
                    in_str = False
                res.append(' ')
            else:
                if content[i] == '\n':
                    res.append('\n')
                else:
                    res.append(' ')
            i += 1
            continue

        # Detect regex literals
        if in_regex:
            if in_regex_class:
                if content[i] == ']':
                    # check escape
                    esc = 0
                    k = i - 1
                    while k >= 0 and content[k] == '\\':
                        esc += 1
                        k -= 1
                    if esc % 2 == 0:
                        in_regex_class = False
                res.append(' ')
                i += 1
                continue
            else:
                if content[i] == '[':
                    # check escape
                    esc = 0
                    k = i - 1
                    while k >= 0 and content[k] == '\\':
                        esc += 1
                        k -= 1
                    if esc % 2 == 0:
                        in_regex_class = True
                    res.append(' ')
                    i += 1
                    continue
                elif content[i] == '/':
                    # check escape
                    esc = 0
                    k = i - 1
                    while k >= 0 and content[k] == '\\':
                        esc += 1
                        k -= 1
                    if esc % 2 == 0:
                        in_regex = False
                    res.append(' ')
                    i += 1
                    continue
                else:
                    if content[i] == '\n':
                        in_regex = False
                        res.append('\n')
                    else:
                        res.append(' ')
                    i += 1
                    continue
            
        # Detect comment starts
        if content[i:i+2] == '//':
            in_line_comment = True
            res.append('  ')
            i += 2
            continue
        if content[i:i+2] == '/*':
            in_multi_comment = True
            res.append('  ')
            i += 2
            continue
            
        # Detect string starts
        if content[i] in ["'", '"', '`']:
            in_str = True
            str_char = content[i]
            res.append(' ')
            i += 1
            continue
            
        # Detect regex literals start
        if content[i] == '/':
            k = len(res) - 1
            while k >= 0 and res[k].isspace():
                k -= 1
            preceding = res[k] if k >= 0 else None
            if preceding in [None, '=', '(', '[', '{', ':', ',', ';', '&', '|', '!', '?', '+', '-', '*', '/']:
                in_regex = True
                res.append(' ')
                i += 1
                continue
                
        # Keep character
        res.append(content[i])
        i += 1
        
    return ''.join(res)

def find_mismatch(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    cleaned = clean_js(content)
    stack = []
    lines = cleaned.split('\n')
    
    for line_num, line in enumerate(lines, 1):
        for col_num, char in enumerate(line, 1):
            if char == '{':
                stack.append(('{', line_num, col_num))
            elif char == '}':
                if not stack:
                    print(f"Mismatched closing '}}' at line {line_num}, col {col_num}")
                    return
                stack.pop()
                
    if stack:
        print(f"Found {len(stack)} unclosed braces. Deepest unclosed:")
        for brace, l, c in stack[-5:]:
            print(f"Unclosed '{brace}' at line {l}, col {c}")
            # print some lines of context around l
            context_start = max(1, l - 2)
            context_end = min(len(lines), l + 10)
            print("Context:")
            for idx in range(context_start, context_end + 1):
                original_lines = content.split('\n')
                prefix = "-> " if idx == l else "   "
                print(f"{prefix}{idx}: {original_lines[idx-1]}")
            print("-" * 40)
    else:
        print("Braces balanced successfully in clean_js!")

find_mismatch("app.js")
