
````markdown
# Pulse Wiki Custom Syntax Guide

This document explains how to use the custom `{{ }}` syntax for content formatting in Pulse Wiki pages.

---

## Custom Commands

### 1. Dropdowns

Use dropdowns to hide or reveal sections of content.

#### Start a dropdown
```js
{{dropDownStart:Title of Dropdown}}
````

* **Title of Dropdown**: The text shown in the summary line.
* All content after this line will appear inside the dropdown until `dropDownEnd`.

#### End a dropdown

```md
{{dropDownEnd}}
```

### 2. Images

Insert images stored in the `resources` folder.

```md
{{img:filename.png}}
```

* Replace `filename.png` with the name of your image file.

---

## Inline Links

Create clickable links to other wiki pages using double square brackets:

```md
[[Page Name]]
```

* Clicking will render the page with that title.

---

## Example

```md
{{dropDownStart:More Info}}
Here is some hidden content.

{{img:example.png}}

Check out [[Another Page]].
{{dropDownEnd}}
```

This will create a dropdown titled "More Info" containing a paragraph, an image, and a clickable link to another page.

---

## Notes

* Markdown is supported inside paragraphs and summaries.
* Commands must occupy a full line.
* Background images are defined in the page style JSON, not in the content.

