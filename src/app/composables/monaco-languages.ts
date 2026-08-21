// Every Monaco language this product colours with, registered in one place.
//
// A "basic language" is a Monarch grammar and a language configuration: it
// colours text and nothing more. That is the whole reason all of them can be
// registered here — none of them starts a worker, validates anything, or offers
// a completion, so registering the full set adds no capability this product
// refuses to have. The *language services* (`esm/vs/language/{json,css,html,
// typescript}`) are the ones that would — with one deliberate exception below.
//
// JSON has no basic-language grammar, and `.mcp.json` and its siblings are
// core customization formats here, so this module builds one: it registers
// the `json` id with the extension claims the service's contribution makes,
// and wires the service's own local tokenizer (`vs/language/json/
// tokenization.js`) to it — the exact module the service uses for its
// `tokens` feature, with no worker behind it. The contribution module
// itself is deliberately not imported: its lazy mode drags the LSP adapters
// and the `json.worker` chunk into the emitted bundle, and a shipped
// language-service worker is what the package gate forbids
// (tests/package/monaco-assets.test.ts). The result is the real `json`
// colouring with nothing that validates, completes, or hovers: marking an
// inspected customization as invalid stays a verdict this product does not
// make (research.md § 7).
//
// Each import below registers an id, its extensions, and a lazy loader; the
// grammar itself is a separate chunk the browser fetches only when a file of
// that language is opened. So this module is a registration table, and a
// repository whose skills ship only Markdown pays for no other grammar.
//
// All of them rather than a chosen few, because the set of files a reader can
// open is the set of files a customization's directory happens to contain
// (contracts/inspection-path-allowlist.md § Bounded companion census) — an
// open-ended set that no hand-picked list stays correct for.
//
// The basic languages are imported for their side effects only:
// `registerLanguage` is the export that matters, and it runs on import.

import 'monaco-editor/esm/vs/basic-languages/abap/abap.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/apex/apex.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/azcli/azcli.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/bat/bat.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/bicep/bicep.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/cameligo/cameligo.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/clojure/clojure.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/coffee/coffee.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/csp/csp.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/cypher/cypher.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/dart/dart.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/dockerfile/dockerfile.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/ecl/ecl.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/elixir/elixir.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/flow9/flow9.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/freemarker2/freemarker2.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/fsharp/fsharp.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/graphql/graphql.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/handlebars/handlebars.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/hcl/hcl.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/ini/ini.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/julia/julia.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/kotlin/kotlin.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/less/less.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/lexon/lexon.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/liquid/liquid.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/lua/lua.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/m3/m3.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/mdx/mdx.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/mips/mips.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/msdax/msdax.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/mysql/mysql.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/objective-c/objective-c.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/pascal/pascal.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/pascaligo/pascaligo.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/perl/perl.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/pgsql/pgsql.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/php/php.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/pla/pla.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/postiats/postiats.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/powerquery/powerquery.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/powershell/powershell.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/protobuf/protobuf.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/pug/pug.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/qsharp/qsharp.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/r/r.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/razor/razor.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/redis/redis.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/redshift/redshift.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/restructuredtext/restructuredtext.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/rust/rust.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/sb/sb.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/scala/scala.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/scheme/scheme.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/scss/scss.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/shell/shell.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/solidity/solidity.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/sophia/sophia.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/sparql/sparql.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/st/st.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/swift/swift.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/systemverilog/systemverilog.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/tcl/tcl.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/twig/twig.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/typespec/typespec.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/vb/vb.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/wgsl/wgsl.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js';
import { languages } from 'monaco-editor/esm/vs/editor/editor.api.js';
import { createTokenizationSupport } from 'monaco-editor/esm/vs/language/json/tokenization.js';

// JSON as a basic language, built here (see the module comment above): the
// id and extension claims mirror the service contribution's own
// registration, and the one feature wired to the id is the service's local
// tokenizer. Comment support is on because `.jsonc` borrows this tokenizer
// (monaco.ts § BORROWED_GRAMMARS), and the tokenizer colours a comment it
// meets rather than validating it away.
languages.register({
  id: 'json',
  extensions: ['.json', '.bowerrc', '.jshintrc', '.jscsrc', '.eslintrc', '.babelrc', '.har'],
  aliases: ['JSON', 'json'],
  mimetypes: ['application/json'],
});
languages.setTokensProvider('json', createTokenizationSupport(true));
