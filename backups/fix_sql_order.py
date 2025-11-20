#!/usr/bin/env python3
"""
Fix SQL file ordering by moving user_org_id() function after table creation
"""

# Read the original file
with open('/Users/kiyoungtack/Desktop/goldpen/backups/goldpen_supabase.sql', 'r') as f:
    lines = f.readlines()

# Extract the user_org_id function (lines 8-16, 0-indexed: 7-15)
# Find the exact lines
user_org_id_start = None
user_org_id_end = None
for i, line in enumerate(lines):
    if 'CREATE OR REPLACE FUNCTION public.user_org_id()' in line:
        user_org_id_start = i
    if user_org_id_start is not None and '$function$;' in line and i > user_org_id_start:
        user_org_id_end = i + 1
        break

print(f"Found user_org_id function at lines {user_org_id_start+1} to {user_org_id_end}")

# Extract the function
user_org_id_function = lines[user_org_id_start:user_org_id_end]

# Remove the function from its current position (keep the blank lines structure clean)
# We'll remove from the comment line before it to the blank line after it
function_with_comment_start = user_org_id_start - 1  # Include the comment line
function_with_blanks_end = user_org_id_end + 2  # Include blank lines after

print(f"Removing lines {function_with_comment_start+1} to {function_with_blanks_end}")

# Create new file without the function
new_lines = lines[:function_with_comment_start] + lines[function_with_blanks_end:]

# Find where to insert: after ALTER TABLE constraints, before CREATE TRIGGER
# Look for the line after the last ALTER TABLE ONLY ... ADD CONSTRAINT
insert_position = None
for i, line in enumerate(new_lines):
    if 'ALTER TABLE ONLY public.users' in line and 'ADD CONSTRAINT users_pkey' in new_lines[i+1]:
        # Found the last constraint, find the next blank section
        j = i + 2
        while j < len(new_lines) and new_lines[j].strip():
            j += 1
        insert_position = j + 1  # After the blank line
        break

print(f"Inserting user_org_id function at line {insert_position+1}")

# Insert the function with proper spacing
insert_content = [
    '\n',
    '-- Create helper function for getting current user\'s organization\n',
    '-- NOTE: This function must be created AFTER tables are defined\n'
] + user_org_id_function + ['\n', '\n']

final_lines = new_lines[:insert_position] + insert_content + new_lines[insert_position:]

# Write the fixed file
output_path = '/Users/kiyoungtack/Desktop/goldpen/backups/supabase_ready.sql'
with open(output_path, 'w') as f:
    f.writelines(final_lines)

print(f"\n✅ Fixed SQL file written to: {output_path}")
print(f"Total lines: {len(final_lines)}")
print(f"\nStructure:")
print(f"  1. ENUM types")
print(f"  2. update_updated_at_column() function (doesn't reference tables)")
print(f"  3. CREATE TABLE statements")
print(f"  4. INSERT statements")
print(f"  5. ALTER TABLE constraints")
print(f"  6. user_org_id() function (NOW HERE - after tables exist)")
print(f"  7. CREATE TRIGGER statements")
print(f"  8. ALTER TABLE foreign keys")
print(f"  9. CREATE POLICY statements")
print(f" 10. ENABLE RLS")
