<p align="center">
    <img src="./icon.png" alt="Bootstrap Email for NodeJS" width="72" height="72">
    <h3 align="center">Bootstrap Email for NodeJS</h3>
    <p align="center">If you know Bootstrap, you know Bootstrap Email.</cite>
</p>

<br>

[![NPM](https://nodei.co/npm/bootstrap-email.png)](https://nodei.co/npm/bootstrap-email/)

<br>

Based on the original [Bootstrap Email by stuyam](https://github.com/stuyam/bootstrap-email), this library allows you to compile a regular HTML markdown with usual Bootstrap classes into cringy table-based email-layouts ... with **JAVASCRIPT 🎉🎊✨**.

# Table of contents

- [Supported Bootstrap Classes](#supported-bootstrap-classes)
- [Additional Classes](#additional-classes)
- [Installation and usage](#installation-and-usage)
- [Options](#options)
- [Methods](#methods)
- [Todos](#todos)
- [Known Bugs](#known-bugs)

## Supported Bootstrap Classes
<small>{color} in these examples is `primary`, `secondary`, `success`, `warning`, `danger`, `light`, and `dark`</small>
- [Alerts](https://bootstrapemail.com/docs/alert): `.alert`, `.alert-{color}`
- [Badges](https://bootstrapemail.com/docs/badge): `.badge`, `.badge-{color}`, `.badge-pill`
- [Buttons](https://bootstrapemail.com/docs/button): `.btn`, `.btn-{color}`, `.btn-outline-{color}`
- [Cards](https://bootstrapemail.com/docs/card): `.card`, `.card-body`
- [Color](https://bootstrapemail.com/docs/color): `.text-{color}`, `.bg-{color}`
- [Containers](https://bootstrapemail.com/docs/container): `.container`, `.container-fluid`
- [Floats](https://bootstrapemail.com/docs/float): `.float-left`, `.float-right`
- [Grid](https://bootstrapemail.com/docs/grid): `.row`, `.col-{1-12}`, `.col-lg-{1-12}`
- [Hrs](https://bootstrapemail.com/docs/hr): `<hr>`
- [Spacing](https://bootstrapemail.com/docs/spacing): `.p{tlbrxy}-{lg-}{0-5}`, `.m{tby}-{lg-}{0-5}`, `mx-auto`
- [Width](): `w-{lg-}{25,50,75,100}`
- [Tables](https://bootstrapemail.com/docs/table): `.table`, `.table-striped`,`.table-bordered`, `.thead-light`, `.thead-dark`, `.table-{color}`, `.table-dark`
- [Typography](https://bootstrapemail.com/docs/typography): `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`, `<strong>`, `<u>`, `<em>`, `<s>`, `.text-{sm|lg-}left`, `.text-{sm|lg-}center`, `.text-{sm|lg-}right`, `.display-{1-4}`, `.lead`, `.small`

## Additional Classes
- [Visibility](https://bootstrapemail.com/docs/visibility): `.d-desktop`, `.d-mobile`

## Installation and usage

Install package with `npm i bootstrap-email -S`

To compile a default template:

```javascript
const BootstrapEmail = require('bootstrap-email');

const template = new BootstrapEmail('<path-to-template>.html');

// const template = new BootstrapEmail([
//     '<path-to-first-template>.html',
//     '<path-to-second-template>.html',
// ]);
//
// const template = new BootstrapEmail('<div class="container">...</div>'); 

template.compileAndSave('<path-to-output>.html');
```

Alternatively use the [Gulp plugin](https://github.com/schwarzdavid/gulp-bootstrap-email) to integrate Bootstrap Email into your templating workflow.

## Options

- `style` _string_ (optional) - Path to css or scss file, which should be inlined. Default is `bootstrap-email.scss`
- `head` _string_ (optional) - Path to css or scss file, which should be injected to `head`. Default is `head.scss`
- `templates` _array&lt;string&gt;_ - Array with paths to html files you want to compile.
- `logLevel`

## Methods

##### new BootstrapEmail(templates, options)

##### compile(): _string | [{path: string, document: string}]_

Performs a full compile and returns compiled document(s).

If only one template is about to compile, returns the compiled template, otherwise an array containing objects with the path of the input-file and the compiled document.

```javascript
const singleTemplate = new BootstrapEmail('<path-to-template>.html');

// returns string
singleTemplate.compile();


const multipleTemplates = new BootstrapEmail(['<path>', ...]);

// returns [{path:'<path-to-source>', document: '...'}, ...]
multipleTemplates.compile();
```

##### compileAndSave(path): _void_

Performs a full compile and saves compiled files into given path.

If only one template is given, pass a full path including filename and extension. Otherwise pass only a directory name. The filenames will be used from the source files.

```javascript
const singleTemplate = new BootstrapEmail('<path-to-template>.html');
singleTemplate.compileAndSave('./out/compiled.html');


const multipleTemplates = new BootstrapEmail(['<path>', ...]);
multipleTemplates.compileAndSave('./out/');
```

## Todos

- [ ] Support multiple CSS/SASS-files
- [ ] Add Typescript typings
- [ ] Implement bootstrap-like vertical align classes
- [ ] Extract automatically CSS that cannot be inlined (`:hover`, `:focus`, ...)
- [ ] Add option for output formatting (minimized, formatted, ...)
- [ ] Write better docs & examples
- [ ] Improve debug-logging

# Known Bugs

- Outlook 2013 on Windows 10 with 120DPI can't scale images properly
- Badges don't have correct paddings on Outlook (Windows ofc)
