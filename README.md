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
- [Spacing](https://bootstrapemail.com/docs/spacing): `.p{tlbrxy}-{lg-}{0-5}`, `.m{tby}-{lg-}{0-5}`, `.s-{lg-}{0-5}`, `w-{lg-}{25,50,75,100}`, `mx-auto`
- [Tables](https://bootstrapemail.com/docs/table): `.table`, `.table-striped`,`.table-bordered`, `.thead-light`, `.thead-dark`, `.table-{color}`, `.table-dark`
- [Typography](https://bootstrapemail.com/docs/typography): `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`, `<strong>`, `<u>`, `<em>`, `<s>`, `.text-left`, `.text-center`, `.text-right`

## Additional Classes
- [Visibility](https://bootstrapemail.com/docs/visibility): `.d-desktop`, `.d-mobile`

## Installation and usage

Install package with `npm i bootstrap-email -S`*

To compile a default template:

```javascript
const BootstrapEmail = require('bootstrap-email');

const template = new BootstrapEmail({
    template: '<path-to-template>.html'
});

template.compileAndSave('<path-to-output>.html');
```

## Options

- `style` _string_ (optional) - Path to css or scss file, which should be inlined. Default is `bootstrap-email.scss`
- `head` _string_ (optional) - Path to css or scss file, which should be injected to `head`. Default is `head.scss`
- `template` _string_ - Path to html file you want to compile. Use this option, if you only have one email template.
- `templates` _array&lt;string&gt;_ - Array with paths to html files you want to compile.

## Methods

##### new BootstrapEmail(options)

##### compile(): _string | [{path: string, document: string}]_

Performs a full compile and returns compiled document(s).

If only one template is about to compile, returns the compiled template, otherwise an array containing objects with the path of the input-file and the compiled document.

```javascript
const singleTemplate = new BootstrapEmail({
    template: '<path-to-template>.html'
});

// returns string
singleTemplate.compile();


const multipleTemplates = new BootstrapEmail({
    templates: ['<path>', ...]
});

// returns [{path:'<path-to-source>', document: '...'}, ...]
multipleTemplates.compile();
```

##### compileAndSave(path): _void_

Performs a full compile and saves compiled files into given path.

If only one template is given, pass a full path including filename and extension. Otherwise pass only a directory name. The filenames will be used from the source files.

```javascript
const singleTemplate = new BootstrapEmail({
    template: '<path-to-template>.html'
});
singleTemplate.compileAndSave('./out/compiled.html');


const multipleTemplates = new BootstrapEmail({
    templates: ['<path>', ...]
});
multipleTemplates.compileAndSave('./out/');
```

## TODOS

- [ ] Write useful tests
- [ ] Update documentation
- [ ] Write gulp plugin


