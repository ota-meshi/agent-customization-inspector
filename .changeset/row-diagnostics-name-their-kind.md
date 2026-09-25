---
'agent-customization-inspector': patch
---

An inventory row that kept a problem now says which kind it is. A file whose frontmatter or declarations did not parse is marked `Could not be parsed`, and a supporting file that could not be read is marked `Could not be read`, where every mark used to read `diagnostic`. The two ask for different fixes, and one skill's row can carry both. Opening a mark still shows what to do about it.
