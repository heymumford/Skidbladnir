#\!/bin/bash
# Script to add copyright headers to all code files

# TypeScript/JavaScript copyright header
TS_HEADER='/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

'

# Python copyright header
PY_HEADER='"""
Copyright (C) 2025 Eric C. Mumford (@heymumford)

This file is part of Skidbladnir.

Skidbladnir is free software: you can redistribute it and/or modify
it under the terms of the MIT License as published in the LICENSE file.
"""

'

# Shell script copyright header
SH_HEADER='#\!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

'

# Go copyright header
GO_HEADER='/*
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 *
 * This file is part of Skidbladnir.
 *
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

'

echo "Adding copyright headers to files..."

# Process TypeScript/JavaScript files
for file in $(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/build/*"); do
    if \! grep -q "Copyright (C) 2025 Eric C. Mumford" "$file"; then
        echo "Adding header to $file"
        temp_file=$(mktemp)
        echo "$TS_HEADER" > "$temp_file"
        cat "$file" >> "$temp_file"
        mv "$temp_file" "$file"
    fi
done

# Process Python files
for file in $(find . -type f -name "*.py" -not -path "*/venv/*" -not -path "*/__pycache__/*"); do
    if \! grep -q "Copyright (C) 2025 Eric C. Mumford" "$file"; then
        echo "Adding header to $file"
        # If file starts with shebang, preserve it
        if [[ $(head -n 1 "$file") == \#\\!* ]]; then
            shebang=$(head -n 1 "$file")
            temp_file=$(mktemp)
            echo "$shebang" > "$temp_file"
            echo "" >> "$temp_file"
            echo "$PY_HEADER" >> "$temp_file"
            tail -n +2 "$file" >> "$temp_file"
            mv "$temp_file" "$file"
        else
            temp_file=$(mktemp)
            echo "$PY_HEADER" > "$temp_file"
            cat "$file" >> "$temp_file"
            mv "$temp_file" "$file"
        fi
    fi
done

# Process shell scripts
for file in $(find . -type f -name "*.sh"); do
    if \! grep -q "Copyright (C) 2025 Eric C. Mumford" "$file"; then
        echo "Adding header to $file"
        # Preserve shebang if it exists
        if [[ $(head -n 1 "$file") == \#\\!* ]]; then
            shebang=$(head -n 1 "$file")
            temp_file=$(mktemp)
            echo "$shebang" > "$temp_file"
            # Remove the existing shebang from the header
            echo "${SH_HEADER#*$'\n'}" >> "$temp_file"
            tail -n +2 "$file" >> "$temp_file"
            mv "$temp_file" "$file"
        else
            temp_file=$(mktemp)
            echo "$SH_HEADER" > "$temp_file"
            cat "$file" >> "$temp_file"
            mv "$temp_file" "$file"
        fi
    fi
done

# Process Go files
for file in $(find . -type f -name "*.go"); do
    if \! grep -q "Copyright (C) 2025 Eric C. Mumford" "$file"; then
        echo "Adding header to $file"
        temp_file=$(mktemp)
        echo "$GO_HEADER" > "$temp_file"
        cat "$file" >> "$temp_file"
        mv "$temp_file" "$file"
    fi
done

echo "All copyright headers have been added\!"
