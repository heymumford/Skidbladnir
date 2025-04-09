#\!/bin/bash
# Simple script to add copyright headers

ts_files=$(find packages scripts -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx")
py_files=$(find scripts -type f -name "*.py")
sh_files=$(find scripts -type f -name "*.sh")

for file in $ts_files; do
  echo "Processing $file"
  sed -i '1i/**\n * Copyright (C) 2025 Eric C. Mumford (@heymumford)\n * \n * This file is part of Skidbladnir.\n * \n * Skidbladnir is free software: you can redistribute it and/or modify\n * it under the terms of the MIT License as published in the LICENSE file.\n */\n' "$file"
done

for file in $py_files; do
  echo "Processing $file"
  sed -i '1i\"""\nCopyright (C) 2025 Eric C. Mumford (@heymumford)\n\nThis file is part of Skidbladnir.\n\nSkidbladnir is free software: you can redistribute it and/or modify\nit under the terms of the MIT License as published in the LICENSE file.\n"""\n' "$file"
done

for file in $sh_files; do
  echo "Processing $file" 
  if [[ $(head -n 1 "$file") == "#\!/bin/bash" || $(head -n 1 "$file") == "#\!/bin/sh" ]]; then
    line=$(head -n 1 "$file")
    sed -i "1d" "$file"
    sed -i "1i\\$line\n#\n# Copyright (C) 2025 Eric C. Mumford (@heymumford)\n#\n# This file is part of Skidbladnir.\n#\n# Skidbladnir is free software: you can redistribute it and/or modify\n# it under the terms of the MIT License as published in the LICENSE file.\n#\n" "$file"
  else
    sed -i '1i#\!/bin/bash\n#\n# Copyright (C) 2025 Eric C. Mumford (@heymumford)\n#\n# This file is part of Skidbladnir.\n#\n# Skidbladnir is free software: you can redistribute it and/or modify\n# it under the terms of the MIT License as published in the LICENSE file.\n#\n' "$file"
  fi
done

echo "Headers added successfully\!"
