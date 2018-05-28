# expressutils

Helper functions for the Express framework (expressjs.com) to render templates, write meta tags, perform localization, implement REST APIs and more.

## Installation

```
npm install @ekliptor/expressutils
```

## Usage

At the top of your source code file write:

with TypeScript:
```
import * as xutils from "@ekliptor/expressutils";
```

with JavaScript:
```
const xutils = require("@ekliptor/expressutils");
```

Now you can process requests with the Responder class of this module
```
router.get('/myRoute', (req, res, next) => {
    let page = new MyPage(req, res, next);
    page.sendMyResponse();
});

class VpnPage extends xutils.Responder {
    constructor(req, res, next) {
        super(req, res, next)
    }

    public sendMyResponse() {
        // do something....
        // this.req, this.res, this.next is available
        // plus lot's of helper functions
    }
}
```