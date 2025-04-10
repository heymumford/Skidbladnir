#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# Wrapper script for the version update utility

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
"${SCRIPT_DIR}/util/update-version.sh" "$@"