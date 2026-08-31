# Third-party notices

This package includes code adapted from other MIT-licensed projects. Their
notices are reproduced below, as the MIT licence requires of any copy.

Design, architecture and findings are not covered by this file — only code.
Where a file below is a close adaptation rather than a verbatim copy, it is
still listed: a paraphrase of someone else's code is a derivative work.

---

## vue-tui

Copyright (c) 2026 Yunfei He. Source: the `@vue-tui/vite` package.

Adapted files in this package:

| File | Adapted from | What changed |
| --- | --- | --- |
| `src/vite/entry-match.ts` | `packages/vite/src/entry-match.ts` | The dev entry is a required plugin option here rather than derived from Vite's top-level `input`, so `devEntryFromViteInput` is dropped; the UNC and Windows drive-letter arms of `resolveConfiguredEntry` are dropped with it. |
| `src/vite/bridge-hmr.ts` | `packages/vite/src/bridge-hmr.ts`, the `runnerPayload` helper and the `ws.send` wrapper | Only the `file-changed` forwarding is taken. The error-pairing half — `ErrorIdentity`, `sameDiagnostic`, the `hot.send` wrapper — is not, because this package ships no error overlay to de-duplicate for. |
| `src/vite/wrap-server-close.ts` | `wrapServerClose` in `packages/vite/src/dev.ts` | Moved to its own module and re-commented; the logic is unchanged. |

### MIT License

```
MIT License

Copyright (c) 2026 Yunfei He

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## ink

Copyright (c) Vadim Demedes. Source: the `ink` package.

`src/input/InputSource.ts` is a port of the input-handling half of ink 7.1.1's
`src/components/App.tsx`, noted in that file's own header. ink is MIT-licensed
under the same terms reproduced above, with Vadim Demedes as the copyright
holder.
