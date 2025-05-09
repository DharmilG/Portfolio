# Skill: local-git

Dirty = `localEdits[path] !== cached`. `M` badge (Explorer), `●` dot (tab),
`main*` (StatusBar). Commit input/terminal `commit -m` unshifts
`{id:local-ts, msg, files, local:true}` and clears dirty. Source Control
renders `[...localCommits, ...realCommits]` with the local SVG `main` lane
on top, flagged "not pushed".

Good: confetti + toast on local commit; discard restores cached blob.
Bad: sending edits to any API; marking local commits without `local:true`.
