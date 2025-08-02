# Skill: local-git

Dirty = `localEdits[path] !== cached`. `M` badge (Explorer), `●` dot (tab),
`main*` (StatusBar). Commit input/terminal `commit -m` unshifts
`{id:local-ts, msg, files, local:true}` and clears dirty. Source Control
renders `[...localCommits, ...realCommits]` with the local SVG `main` lane
on top, flagged "not pushed".

Good: local commit clears saved edits and prepends a local commit; discard restores cached blob. The SCM input is single-line and commit has no celebration animation.
Bad: sending edits to any API; marking local commits without `local:true`.
