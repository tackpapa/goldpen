# Known Issues

## Console Warnings (Non-Breaking)

### 1. Recharts defaultProps Warnings
**Status**: Informational (Can be ignored)
**Severity**: Low
**Description**: Recharts library shows deprecation warnings about `defaultProps` in XAxis and YAxis components.

```
Warning: XAxis: Support for defaultProps will be removed from function components in a future major release.
Warning: YAxis: Support for defaultProps will be removed from function components in a future major release.
```

**Impact**: None - purely informational. These warnings come from the Recharts library itself and don't affect functionality.
**Solution**: Wait for Recharts to update their library. The warnings will disappear when Recharts migrates away from defaultProps.
**Workaround**: None needed - the charts work perfectly.

---

## Database Schema Issues

### 1. audit_logs Table Missing
**Status**: Not Yet Implemented
**Severity**: Medium
**Description**: The `audit_logs` table doesn't exist in the current database schema.

```javascript
[Audit Logs GET] Error: {
  code: 'PGRST205',
  message: 'Could not find the table \'public.audit_logs\' in the schema cache'
}
```

**Impact**: Audit logs page shows 500 errors.
**Solution**: Run the migration to create the `audit_logs` table.
**Migration File**: `supabase/migrations/20251120_create_audit_logs_fixed.sql`

**To fix**:
```bash
# Apply the migration via Supabase CLI
supabase db push

# Or run the SQL manually in Supabase SQL Editor
```

### 2. organizations-users Relationship Missing
**Status**: Schema Incomplete
**Severity**: Medium
**Description**: Foreign key relationship between `organizations` and `users` tables is not properly configured.

```javascript
[Organizations GET] Error: {
  code: 'PGRST200',
  message: 'Could not find a relationship between \'organizations\' and \'users\' in the schema cache'
}
```

**Impact**: Organizations page shows 500 errors when trying to fetch owner information.
**Solution**: Add proper foreign key constraint in the schema.

---

## Avatar Images (Fixed ✅)

### Status: Resolved
**Previous Issue**: Missing avatar image files caused 404 errors.
**Files Affected**:
- `/avatars/admin.png` → Now `/avatars/admin.svg`
- `/avatars/01.png` → Now `/avatars/01.svg`

**Resolution**: Created placeholder SVG avatars and updated component references.

---

## Summary

### Critical Issues: 0
### Medium Issues: 2 (Database schema)
### Low Issues: 1 (Recharts warnings)
### Fixed Issues: 1 (Avatar images)

---

**Last Updated**: 2025-11-20
**Next Review**: After database migration completion
