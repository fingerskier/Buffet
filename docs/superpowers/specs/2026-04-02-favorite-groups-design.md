# Favorite Groups

## Context

Buffet currently has individual favorites (starred unit configs persisted in `favorite-records.json`) and a basic `FavoriteGroup` type that embeds unit configs inline. The FavoritesPanel can create groups from starred units and batch-launch them, but there's no way to create empty groups, add/remove individual favorites from groups, rename or delete groups, or view grouped favorites in the Dashboard.

This design adds full CRUD for favorite groups with a tagging model (favorites can belong to multiple groups) and integrates group display directly into the Dashboard favorites view.

## Data Model

### Schema change: `FavoriteGroup`

**Current** (embeds unit configs — causes duplication):
```typescript
interface FavoriteGroup {
  name: string
  units: Array<{ name: string; shell: ShellType; cwd: string }>
}
```

**New** (references favorites by ID):
```typescript
interface FavoriteGroup {
  id: string          // UUID
  name: string
  favoriteIds: string[]  // references Favorite.id
}
```

- Favorites remain independent records in `favorite-records.json`
- Groups reference favorites by ID — no data duplication
- A favorite can appear in multiple groups (tagging model)
- When a favorite is deleted, its ID is cleaned from all groups on next load

### Persistence

- Groups stored in existing `favorites.json` (already used by `ConfigService.getFavorites/saveFavorites`)
- Schema migration: on load, if a group has `units` array instead of `favoriteIds`, convert by matching `{name, shell, cwd}` against existing favorite records

### Files affected

- `src/shared/types.ts` — update `FavoriteGroup` interface
- `src/main/services/config.ts` — migration logic, dangling ID cleanup on load

## Group CRUD Operations

### Create Group
- User clicks **+ New Group** button in Dashboard favorites view
- Inline text input for group name
- Creates empty group; favorites are added afterward

### Rename Group
- **...** menu on group header → "Rename"
- Inline edit (same pattern as UnitCard name editing)

### Delete Group
- **...** menu on group header → "Delete"
- Removes group only; favorites remain as individual records

### Add Favorite to Group
- **Add to Group** button on each favorite card (in Dashboard favorites view)
- Shows dropdown/popover of existing groups with checkboxes (multi-select since favorites can be in multiple groups)
- Toggling a checkbox adds/removes the favorite from that group

### Remove Favorite from Group
- **Remove** button on favorite cards within a group section
- Removes the favorite's ID from that group's `favoriteIds`
- The favorite itself is NOT deleted

### Batch Launch
- **Launch All** button on group header
- Spawns all favorites in the group sequentially (existing pattern from FavoritesPanel)

## UI Design

### Dashboard Favorites View

When the status filter is set to "Favorites", the Dashboard shows:

1. **Header bar** with "+ New Group" button
2. **Ungrouped section** — favorites not in any group, shown first
3. **Group sections** — one per group, each with:
   - Collapsible header: expand/collapse arrow, group name, favorite count, "Launch All" button, "..." menu
   - Grid of FavoriteCards (same card component used for ungrouped)
   - Cards within groups show a "Remove" button to remove from that group

A favorite in multiple groups appears in each group's section.

### FavoriteCard Changes

Add to the existing card:
- **Add to Group** button — opens group-assignment dropdown
- **Remove** button — shown only when card is rendered inside a group section (passed as prop)

### FavoritesPanel

The existing FavoritesPanel overlay becomes redundant since group management moves to the Dashboard. It can be removed or repurposed. For this iteration: remove it — its functionality is fully replaced.

## IPC / Service Layer

### Existing endpoints (reused)
- `config:getFavorites` / `config:saveFavorites` — already handle `FavoriteGroup[]`
- `config:getFavoriteRecords` / `config:saveFavoriteRecords` — individual favorites

### No new IPC endpoints needed
All group CRUD is done renderer-side by reading the full groups array, mutating, and saving back — same pattern used for favorite records in `App.svelte`. This keeps the architecture consistent.

## State Management

### Existing stores (reused)
- `favoriteGroups` store in `stores/config.ts` — already exists, writable of `FavoriteGroup[]`
- `favoriteRecords` store — individual favorites
- `refreshFavorites()` / `refreshFavoriteRecords()` — already exist

## Component Changes Summary

| Component | Change |
|-----------|--------|
| `types.ts` | Update `FavoriteGroup` to use `id` + `favoriteIds` |
| `config.ts` (service) | Migration from old schema, dangling ID cleanup |
| `Dashboard.svelte` | Grouped favorites view with collapsible sections |
| `FavoriteCard.svelte` | Add "Add to Group" and conditional "Remove" |
| `App.svelte` | Group CRUD handlers, wire new callbacks to Dashboard |
| `FavoritesPanel.svelte` | Remove (functionality moves to Dashboard) |
| `Toolbar.svelte` | Remove FavoritesPanel toggle button if present |

## Verification

1. **Create group**: Click "+ New Group", enter name, verify it appears as empty collapsible section
2. **Add to group**: Click "Add to Group" on a favorite, select a group, verify card appears in group section
3. **Multi-group**: Add same favorite to two groups, verify it appears in both
4. **Remove from group**: Click "Remove" on a card in a group, verify removed from group but still exists as ungrouped
5. **Rename group**: Use "..." menu → Rename, verify name updates
6. **Delete group**: Use "..." menu → Delete, verify group gone, favorites still exist
7. **Launch All**: Click on group header, verify all member favorites spawn terminals
8. **Persistence**: Refresh app, verify groups and membership survive restart
9. **Migration**: If old `favorites.json` exists with `units` array format, verify it converts correctly
10. **Dangling cleanup**: Delete a favorite, verify its ID is removed from groups on next load
