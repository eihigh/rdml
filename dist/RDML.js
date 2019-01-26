"use strict";
/* ============================================================
 *  RDML.js
 * ------------------------------------------------------------
 *  Copyright (c) 2019 eihigh
 *  This plugin is released under the MIT License.
 * ============================================================

/*:ja
 * @plugindesc HTML/XML風汎用構文でRPGツクールのデータを記述するためのプラグイン
 * @author eihigh
 *
 * @param paths
 * @type ...[]
 */
/// <reference path="doc.ts" />
var rdml;
(function (rdml) {
    var check;
    (function (check) {
        var CheckError = /** @class */ (function () {
            function CheckError(message) {
                this.message = message;
                this.name = "Parameter Error";
            }
            return CheckError;
        }());
        check.CheckError = CheckError;
        function float(src, min, max) {
            var f = parseFloat(src);
            if (isNaN(f)) {
                throw new CheckError("cannot parse \"" + src + "\" as float value");
            }
            if (min !== null) {
                if (f < min) {
                    throw new CheckError("expected param(" + src + ") >= min(" + min + ")");
                }
            }
            if (max !== null) {
                if (max < f) {
                    throw new CheckError("expected param(" + src + ") < max(" + max + ")");
                }
            }
            return f;
        }
        check.float = float;
        function int(src, min, max) {
            var f = float(src, min, max);
            var i = parseInt(src);
            if (i !== f) {
                throw new CheckError("\"" + src + "\" is not integer\"");
            }
            return i;
        }
        check.int = int;
    })(check = rdml.check || (rdml.check = {}));
})(rdml || (rdml = {}));
/// <reference path="doc.ts" />
var rdml;
(function (rdml) {
    var Element = /** @class */ (function () {
        function Element() {
            this.name = "";
            this.attrs = {};
            this.childNodes = [];
        }
        Object.defineProperty(Element.prototype, "children", {
            get: function () {
                return this.childNodes.filter(function (x) { return typeof x !== "string"; });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Element.prototype, "data", {
            get: function () {
                if (this.childNodes.length === 1) {
                    var c = this.childNodes[0];
                    if (typeof c === "string") {
                        return c;
                    }
                    return "";
                }
                var s = "";
                for (var _i = 0, _a = this.childNodes; _i < _a.length; _i++) {
                    var c = _a[_i];
                    if (typeof c === "string") {
                        s += c;
                    }
                }
                return s;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Element.prototype, "isEmptyElement", {
            get: function () {
                switch (this.name) {
                    case "br":
                        return true;
                }
                return false;
            },
            enumerable: true,
            configurable: true
        });
        return Element;
    }());
    rdml.Element = Element;
})(rdml || (rdml = {}));
/// <reference path="types.ts" />
/// <reference path="check.ts" />
var rdml;
(function (rdml) {
    var conv;
    (function (conv) {
        var Fixed = /** @class */ (function () {
            function Fixed(param) {
                this.param = param;
            }
            Fixed.prototype.convert = function (src) { return this.param; };
            return Fixed;
        }());
        conv.Fixed = Fixed;
        var Int = /** @class */ (function () {
            function Int(min, max) {
                this.min = min;
                this.max = max;
            }
            Int.prototype.convert = function (src) { return rdml.check.int(src, this.min, this.max); };
            return Int;
        }());
        conv.Int = Int;
        var Match = /** @class */ (function () {
            function Match(cases) {
                this.cases = cases;
            }
            Match.prototype.convert = function (src) {
                if (src in this.cases) {
                    return this.cases[src].convert("");
                }
                return this.cases[""].convert(src);
            };
            return Match;
        }());
        conv.Match = Match;
    })(conv = rdml.conv || (rdml.conv = {}));
    var units = {
        id: {
            attr: "id",
            desc: "ID",
            converter: new conv.Int(0, null),
        },
        idBased1: {
            attr: "id",
            desc: "1以上のID",
            converter: new conv.Match({
                "all": new conv.Fixed(-2),
                "": new conv.Int(1, null),
            }),
        },
        actorID: {
            attr: "id",
            desc: "アクターID",
            converter: new conv.Match({
                "all": new conv.Fixed(0),
                "": new conv.Int(1, null),
            }),
        },
        time: {
            attr: "time",
            desc: "フレーム数",
            converter: new conv.Int(0, null),
        },
    };
    var REQUIRED = null;
    var cmdDefinitions = {
        wait: {
            code: 230,
            aliases: [],
            dataAttr: "time",
            rdmlParams: [
                {
                    unit: units.time,
                    desc: "ウェイト時間",
                    default: 60,
                },
            ],
            tkoolParams: [
                { attr: "time" },
            ],
        },
    };
    function elem2cmd(el) {
        if (!(el.name in cmdDefinitions)) {
            throw new Error("unknown command \"" + el.name + "\"");
        }
        var cmd = cmdDefinitions[el.name]; // TODO aliases
        var results = {};
        for (var _i = 0, _a = cmd.rdmlParams; _i < _a.length; _i++) {
            var rp = _a[_i];
            var unit = rp.unit;
            var attr = unit.attr; // TODO aliases
            var value = el.attrs[attr];
            if (rp.default === REQUIRED && value === "") {
                throw new Error("required \"" + attr + "\" for \"" + el.name + "\" command");
            }
            var conved = (value === "" && rp.default !== null)
                ? rp.default : unit.converter.convert(value);
            results[attr] = conved;
        }
        var params = [];
        for (var _b = 0, _c = cmd.tkoolParams; _b < _c.length; _b++) {
            var tp = _c[_b];
            var param = results[tp.attr];
            params.push(param);
        }
        return {
            code: cmd.code,
            indent: 0,
            parameters: params,
        };
    }
    rdml.elem2cmd = elem2cmd;
})(rdml || (rdml = {}));
/// <reference path="types.ts" />
/// <reference path="eventcommand.ts" />
var rdml;
(function (rdml) {
    /*
     * proc: event procedure
     * called as common event
     */
    function execProc(i, id) {
        var cmds = rdml.procs[id].cmds;
        i.setupChild(cmds, 0);
    }
    rdml.execProc = execProc;
    function makeProc(el) {
        var name = el.attrs["name"];
        rdml.procs[name] = new Proc(el);
    }
    rdml.makeProc = makeProc;
    rdml.procs = {};
    var Proc = /** @class */ (function () {
        function Proc(root) {
            this.cmds = [];
            this.lastCmd = null;
            this.children = {};
            this.parseBlock(root, 0);
        }
        Proc.prototype.parseBlock = function (parent, depth) {
            for (var _i = 0, _a = parent.children; _i < _a.length; _i++) {
                var el = _a[_i];
                // TODO special cases
                var cmd = rdml.elem2cmd(el);
                cmd.indent = depth;
                this.cmds.push(cmd);
            }
            // push empty command
            this.cmds.push({
                code: 0,
                indent: depth,
                parameters: [],
            });
        };
        return Proc;
    }());
    rdml.Proc = Proc;
})(rdml || (rdml = {}));
/// <reference path="doc.ts" />
var rdml;
(function (rdml) {
    var sp = " ";
    var spCc = sp.charCodeAt(0);
    var wsp = "　";
    var wspCc = wsp.charCodeAt(0);
    var tab = "\t";
    var tabCc = tab.charCodeAt(0);
    var lt = "<";
    var ltCc = lt.charCodeAt(0);
    var gt = ">";
    var gtCc = gt.charCodeAt(0);
    var cr = "\r";
    var crCc = cr.charCodeAt(0);
    var lf = "\n";
    var lfCc = lf.charCodeAt(0);
    var minus = "-";
    var minusCc = minus.charCodeAt(0);
    var slash = "/";
    var slashCc = slash.charCodeAt(0);
    var excl = "!";
    var exclCc = excl.charCodeAt(0);
    var equal = "=";
    var equalCc = equal.charCodeAt(0);
    var singleQt = "'";
    var singleQtCc = singleQt.charCodeAt(0);
    var doubleQt = '"';
    var doubleQtCc = doubleQt.charCodeAt(0);
    var ItemType;
    (function (ItemType) {
        ItemType[ItemType["invalid"] = 0] = "invalid";
        ItemType[ItemType["eof"] = 1] = "eof";
        ItemType[ItemType["text"] = 2] = "text";
        ItemType[ItemType["leftStartTag"] = 3] = "leftStartTag";
        ItemType[ItemType["elemName"] = 4] = "elemName";
        ItemType[ItemType["attr"] = 5] = "attr";
        ItemType[ItemType["equal"] = 6] = "equal";
        ItemType[ItemType["value"] = 7] = "value";
        ItemType[ItemType["rightStartTag"] = 8] = "rightStartTag";
        ItemType[ItemType["rightEmptyTag"] = 9] = "rightEmptyTag";
        ItemType[ItemType["leftEndTag"] = 10] = "leftEndTag";
        ItemType[ItemType["rightEndTag"] = 11] = "rightEndTag";
    })(ItemType = rdml.ItemType || (rdml.ItemType = {}));
    var Item = /** @class */ (function () {
        function Item(typ, start, end) {
            this.typ = typ;
            this.start = start;
            this.end = end;
        }
        return Item;
    }());
    rdml.Item = Item;
    var ScanError = /** @class */ (function () {
        function ScanError(msg, line) {
            this.name = "Syntax Error";
            this.message = this.name + ": " + msg + " at line " + line;
        }
        return ScanError;
    }());
    var Scanner = /** @class */ (function () {
        function Scanner(src) {
            this.src = ""; // source
            this.cc = 0; // current charCode; surrogate pair ignored
            this.start = 0; // token start offset
            this.offset = -1; // charcter offset
            this.line = 1; // line number
            this.width = 1; // charcter width
            this.items = [];
            this.err = null;
            this.src = src;
            this.next();
        }
        Scanner.prototype.next = function () {
            this.offset += this.width;
            if (this.src.length <= this.offset) {
                this.cc = -1;
                return;
            }
            var c = this.src.charCodeAt(this.offset);
            this.width = (0xD800 <= c && c <= 0xDBFF) || (0xDC00 <= c && c <= 0xDFFF) ? 2 : 1;
            this.cc = c;
            if (this.cc === lfCc) {
                this.line++;
            }
        };
        Scanner.prototype.emit = function (typ) {
            this.items.push(new Item(typ, this.start, this.offset));
            this.start = this.offset;
        };
        Scanner.prototype.run = function () {
            var state = this.scanText;
            while (state !== null) {
                state = state.call(this);
            }
            if (this.err !== null) {
                throw this.err;
            }
        };
        Scanner.prototype.fail = function (msg) {
            this.emit(ItemType.invalid);
            this.err = new ScanError(msg, this.line);
            return null;
        };
        Scanner.prototype.ignoreSpaces = function () {
            while (!this.isEOF) {
                if (!this.isSpace) {
                    break;
                }
                this.next();
                this.start = this.offset;
            }
        };
        Object.defineProperty(Scanner.prototype, "isSpace", {
            get: function () {
                switch (this.cc) {
                    case spCc:
                    case wspCc:
                    case crCc:
                    case lfCc:
                    case tabCc:
                        return true;
                }
                return false;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Scanner.prototype, "isNamespacer", {
            get: function () {
                if (this.isSpace) {
                    return true;
                }
                switch (this.cc) {
                    case gtCc:
                    case slashCc:
                    case equalCc:
                        return true;
                }
                return false;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Scanner.prototype, "isEOF", {
            get: function () {
                return this.cc < 0;
            },
            enumerable: true,
            configurable: true
        });
        Scanner.prototype.dump = function () {
            var obj = [];
            for (var _i = 0, _a = this.items; _i < _a.length; _i++) {
                var item = _a[_i];
                obj.push({
                    typ: item.typ,
                    lit: this.src.slice(item.start, item.end),
                });
            }
            return JSON.stringify(obj);
        };
        Scanner.prototype.scanText = function () {
            while (!this.isEOF) {
                if (this.cc === ltCc) {
                    if (this.start < this.offset) {
                        this.emit(ItemType.text);
                    }
                    return this.scanTag;
                }
                this.next();
            }
            if (this.start < this.offset) {
                this.emit(ItemType.text);
            }
            this.emit(ItemType.eof);
            return null;
        };
        Scanner.prototype.scanTag = function () {
            this.next(); // consume '<'
            if (this.cc === slashCc) {
                this.next(); // consume '/'
                this.emit(ItemType.leftEndTag);
                return this.scanLeftEndTag;
            }
            this.emit(ItemType.leftStartTag);
            return this.scanStartTag;
        };
        Scanner.prototype.scanLeftEndTag = function () {
            while (!this.isEOF) {
                if (this.isNamespacer) {
                    this.emit(ItemType.elemName);
                    return this.scanRightEndTag;
                }
                this.next();
            }
            return this.fail("unclosed end tag");
        };
        Scanner.prototype.scanRightEndTag = function () {
            while (!this.isEOF) {
                if (this.cc === gtCc) {
                    this.next(); // consume '>'
                    this.emit(ItemType.rightEndTag);
                    return this.scanText;
                }
                if (!this.isSpace) {
                    return this.fail("expected '>'");
                }
                // consume and ignore space
                this.next();
                this.start = this.offset;
            }
            return this.fail("unclosed end tag");
        };
        Scanner.prototype.scanStartTag = function () {
            while (!this.isEOF) {
                if (this.isNamespacer) {
                    this.emit(ItemType.elemName);
                    return this.scanAttribute;
                }
                this.next();
            }
            return this.fail("unclosed start tag");
        };
        Scanner.prototype.scanAttribute = function () {
            this.ignoreSpaces();
            switch (this.cc) {
                case slashCc:
                    this.next(); // consume '/'
                    if (this.cc === gtCc) {
                        this.next(); // consume '>'
                        this.emit(ItemType.rightEmptyTag);
                        return this.scanText;
                    }
                    return this.fail("expected '/>', found '/'");
                case gtCc:
                    this.next(); // consume '>'
                    this.emit(ItemType.rightStartTag);
                    return this.scanText;
                case singleQtCc:
                case doubleQtCc:
                    return this.fail("unexpected " + this.src[this.offset]);
            }
            while (!this.isEOF) {
                if (this.isNamespacer) {
                    this.emit(ItemType.attr);
                    this.ignoreSpaces();
                    if (this.cc === equalCc) {
                        this.next(); // consume '='
                        this.emit(ItemType.equal);
                        this.ignoreSpaces();
                        return this.scanValue;
                    }
                    return this.fail("expected '='");
                }
                this.next();
            }
            return this.fail("unclosed start tag");
        };
        Scanner.prototype.scanValue = function () {
            var qt = this.cc; // ' or "
            this.next(); // consume qt
            this.start = this.offset;
            while (!this.isEOF) {
                if (this.cc === qt) {
                    this.emit(ItemType.value);
                    this.next(); // consume qt
                    this.start = this.offset;
                    return this.scanAttribute;
                }
                this.next();
            }
            return this.fail("unclosed value");
        };
        return Scanner;
    }());
    rdml.Scanner = Scanner;
})(rdml || (rdml = {}));
// const src = `<p a    = '  aaaa'   />`
// console.log(src);
// let s = new rdml.Scanner(src);
// console.time('scanning');
// try {
//   s.run();
// } catch (e) {
//   console.log(e.message);
// }
// console.timeEnd('scanning');
// const fact = s.dump();
// console.log(fact);
/// <reference path="types.ts" />
/// <reference path="scanner.ts" />
var rdml;
(function (rdml) {
    function parseString(src) {
        var scanner = new rdml.Scanner(src);
        scanner.run();
        var parser = new Parser(scanner);
        return parser.parse();
    }
    rdml.parseString = parseString;
    var Parser = /** @class */ (function () {
        function Parser(scn) {
            this.scn = scn;
            this.pos = 0;
        }
        Parser.prototype.next = function () {
            this.pos++;
        };
        Object.defineProperty(Parser.prototype, "item", {
            get: function () {
                return this.scn.items[this.pos];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Parser.prototype, "typ", {
            get: function () {
                return this.item.typ;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Parser.prototype, "lit", {
            get: function () {
                var i = this.item;
                return this.scn.src.slice(i.start, i.end);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Parser.prototype, "isEOF", {
            get: function () {
                return this.pos >= this.scn.items.length;
            },
            enumerable: true,
            configurable: true
        });
        Parser.prototype.parse = function () {
            var c = this.parseNodes("");
            return c;
        };
        Parser.prototype.parseNodes = function (elName) {
            var nodes = [];
            //
            // if (elName === "script") {
            //   let before = this.item;
            //   const start = before.start;
            //   this.next();
            //   while (true) {
            //     if (this.typ === ItemType.elemName && before.typ === ItemType.leftEndTag) {
            //       if (this.lit === "script") {
            //         const end = before.start;
            //         nodes.push(this.scn.src.slice(start, end));
            //         return nodes;
            //       }
            //     }
            //   }
            // }
            while (!this.isEOF) {
                switch (this.typ) {
                    case rdml.ItemType.text:
                        nodes.push(replaceEntitiesInText(this.lit));
                        break;
                    case rdml.ItemType.leftStartTag:
                        nodes.push(this.parseElement());
                        break;
                    case rdml.ItemType.leftEndTag:
                        if (this.lit !== elName) {
                            // error
                        }
                        this.next(); // consume </
                        this.next(); // consume name
                        this.next(); // consume >
                        return nodes;
                }
                this.next();
            }
            return nodes;
        };
        Parser.prototype.parseElement = function () {
            var el = new rdml.Element();
            this.next(); // consume <
            el.name = this.lit;
            this.next();
            while (!this.isEOF) {
                var typ = this.typ;
                var lit = this.lit;
                this.next(); // always make progress
                switch (typ) {
                    case rdml.ItemType.rightStartTag:
                        el.childNodes = this.parseNodes(el.name);
                        return el;
                    case rdml.ItemType.rightEmptyTag:
                        return el;
                }
                // otherwise, attribute found
                var attr = lit;
                this.next(); // consume '='
                var value = this.lit;
                this.next(); // consume value
                el.attrs[attr] = replaceEntitiesInValue(value);
            }
            return el;
        };
        return Parser;
    }());
    rdml.Parser = Parser;
    function replaceEntitiesInValue(src) {
        src = src.replace(/&quot;/g, "\"");
        src = src.replace(/&apos;/g, "'");
        src = src.replace(/&amp;/g, "&");
        return src;
    }
    function replaceEntitiesInText(src) {
        src = src.replace(/&lt;/g, "<");
        src = src.replace(/&gt;/g, ">");
        src = src.replace(/&amp;/g, "&");
        return src;
    }
})(rdml || (rdml = {}));
var str = "<p>text<m></m></p>";
var nodes = rdml.parseString(str);
console.time("parse");
console.log(JSON.stringify(nodes));
console.timeEnd("parse");
/// <reference path="event.ts" />
/// <reference path="parser.ts" />
var rdml;
(function (rdml) {
    function load(paths) {
        for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {
            var path = paths_1[_i];
            if (!(path in files)) {
                files[path] = new File(path);
            }
        }
    }
    rdml.load = load;
    function hasLoaded() {
        var loaded = true;
        for (var path in files) {
            var file = files[path];
            loaded = loaded && file.loaded;
        }
        return loaded;
    }
    rdml.hasLoaded = hasLoaded;
    var files = {};
    var File = /** @class */ (function () {
        function File(path) {
            var _this = this;
            this.path = path;
            this.xhr = new XMLHttpRequest();
            this.loaded = false;
            var fullpath = "rdml/" + path;
            this.xhr.open("GET", fullpath);
            this.xhr.onload = function () {
                if (_this.xhr.status < 400) {
                    _this.onload();
                    _this.loaded = true;
                }
            };
            this.xhr.send();
        }
        File.prototype.onload = function () {
            var nodes = rdml.parseString(this.xhr.responseText);
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var node = nodes_1[_i];
                if (typeof node === "string") {
                    continue;
                }
                var el = node;
                if (el.name === "package") {
                    var pname = el.attrs["name"];
                    for (var _a = 0, _b = el.children; _a < _b.length; _a++) {
                        var child = _b[_a];
                        this.make(pname, child);
                    }
                }
                else {
                    this.make("", el);
                }
            }
        };
        File.prototype.make = function (pname, el) {
            switch (el.name) {
                case "proc":
                    rdml.makeProc(el);
                    break;
            }
        };
        return File;
    }());
})(rdml || (rdml = {}));
/// <reference path="doc.ts" />
/// <reference path="loader.ts" />
/// <reference path="event.ts" />
(function () {
    // return; // for testing
    // helpers
    var pluginName = "RDML";
    var params = {};
    var paramString = function (keys) {
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            var value = PluginManager.parameters(pluginName)[key];
            if (value) {
                return value;
            }
        }
        return '';
    };
    // load all files
    try {
        var paths = JSON.parse(paramString(["paths"]));
        if (!paths) {
            throw new Error();
        }
        rdml.load(paths);
    }
    catch (e) {
        throw new Error("invalid parameter: RDML.paths");
    }
    // define plugin command
    var __pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (cmd, args) {
        __pluginCommand.call(this, cmd, args);
        if (cmd !== "rdml") {
            return;
        }
        var subcmd = args[0];
        switch (subcmd) {
            case "proc":
                rdml.execProc(this, args[1]);
                break;
        }
    };
    // load waiting
    var __updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function () {
        if (this._waitMode === "rdml loading") {
            if (rdml.hasLoaded()) {
                this._waitMode = "";
                return false;
            }
            return true;
        }
        return __updateWaitMode.call(this);
    };
    // set load waiting mode (CONFLICTABLE)
    var __initialize = Game_Interpreter.prototype.initialize;
    Game_Interpreter.prototype.initialize = function (depth) {
        __initialize.call(this, depth);
        if (!rdml.hasLoaded()) {
            this._waitMode = "rdml loading";
        }
    };
})();
