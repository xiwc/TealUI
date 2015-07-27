
/**
 * 所有支持的标签信息。
 */
var tags = {
    access: {
        type: 'text'
    },

    summary: {
        type: 'html'
    },

    param: {
        type: 'param'
    },
    params: {alias: 'param'},

    'return': {
        type: 'return'
    },
    returns: {alias:  'return'},

    'throw': {
        type: 'return'
    },
    'throws': {alias: 'throw'},
    exception: {alias: 'throw'},

    example: {
        type: 'code'
    },
    sample: {alias: 'example'}
};

/**
 * 解析源码并返回所有标记列表。
 */
function parseDoc(content) {
    var reader = new SourceReader(content);
    var docComments = getAllDocComments(reader);
    return docComments;
}

/**
 * 获取源码中所有文档注释。
 */
function getAllDocComments(reader) {

    var docComments = [],
        docComment,
        lastPos,
        token = reader.readTo("///", "/**");

    // 提取所有注释原始信息。
    while (token) {

        if (token.content === "///") {
            reader.readTo("\n");
            hasSingleLineComments = true;
        } else {
            reader.readTo("*/");
        }

        // 保存当前文档注释内容。
        docComment = {
            type: token.content,
            line: token.line,
            col: token.col,
            indent: token.indent,
            content: reader.source.substring(token.pos, lastPos = reader.pos)
        };

        // 多读取 2 行文本，以便之后提取信息。
        while (token = reader.readTo("///", "/**", "\n")) {

            // 连续多个 /// 合并为一个注释。
            if (token.content === "///" && docComment.type === "///") {
                reader.readTo("\n");
                docComment.content += "\n" + reader.source.substring(token.pos, lastPos = reader.pos);
                continue;
            }

            // 继续读取一行。
            if (token.content === "\n") {
                token = reader.readTo("///", "/**", "\n");
            }
            break;
        }

        // 解析剩余部分。
        docComment.rest = reader.source.substring(lastPos + 1, (token || reader).pos).trim();
        docComment.content = (docComment.type === "///" ? docComment.content.replace(/^\s*\/\/\/\s*/gm, "") : docComment.content.substring("/**".length, docComment.content.length - "*/".length).replace(/^\s*\*[ \t]*/mg, "")).trim();
        docComment.tags = parseDocComment(docComment.content, docComment.rest);
        docComments.push(docComment);

        // 跳过当前换行。
        if (token && token.content === "\n") {
            token = reader.readTo("///", "/**");
        }

    }

    return docComments;
}

/**
 * 解析一个文档注释。
 */
function parseDocComment(comment, rest) {
    var result = {};

    comment = comment.split('\n@');
    var content = comment[0].trim();
    result.summary = content ? [content] : [];
    for (var i = 1; i < comment.length; i++) {
        var match = /^(\w+)\s+/.exec(comment[i]) || ['', ''],
            tag = tags[match[1]] && tags[match[1]].alias || match[1];
        result[tag] = result[tag] || [];
        result[tag].push(comment[i].substr(match[0].length).trim());
    }

    // 修复内置标签。
    for(var tag in result){
        var tagInfo = tags[tag];
        if(tagInfo) {

            for(var i = 0; i < result[tag].length; i++) {
                var content = result[tag][i];

                switch(tagInfo.type) {

                    // 解析参数。
                    case 'param':
                        var match = /^(\{([^\}]*)\})?\s*((\w+)|\[(\w+)(=([^\]]+))?\])?\s+/.exec(content) || [''];
                        content = {
                            type: match[2] || '',
                            name: match[4] || match[5] || '',
                            optional: !!match[5],
                            defaultValue: match[7] || '',
                            summary: parseMarkDown(content.substr(match[0].length))
                        };
                        break;

                    case 'return':
                        var match = /^(\{([^\}]*)\})?\s+/.exec(content) || [''];
                        content = {
                            type: match[2] || '',
                            summary: parseMarkDown(content.substr(match[0].length))
                        };
                        break;

                    case 'html':
                        content = parseMarkDown(content);
                        break;

                    case "code":
                        content = parseCode(content);
                        break;

                }

                result[tag][i] = content;

            }

            switch(tagInfo.type) {
                case 'html':
                    result[tag] =  result[tag].join('<br>');
                    break;
                case 'text':
                    result[tag] =  result[tag].join('\n');
                    break;
            }
        }
    }

    if(!result.access) {
        var access = [];
        if(result["public"]) {
            access.push("public");
        }
        if(result["protected"]) {
            access.push("protected");
        }
        if(result["private"]) {
            access.push("private");
        }
        if(access.length) {
            result.access = access.join(' ');
        }
    }

    // 从代码提取信息。
    if(rest) {
        var match = /(([$\w\.\s]+)\.)?\s*([$\w]+)\s*([:=])\s*(.*)/.exec(rest);
        if(match) {
            result.memberOf = result.memberOf || match[2];
            result.name = result.name || match[3];

            if(/^\d/.test(match[5])) {
                result.type = result.type || "Number";
            } else if(/^['"]/.test(match[5])) {
                result.type = result.type || "String";
            } else if(/^(true|false)\b/.test(match[5])) {
                result.type = result.type || "Boolean";
            } else if(/^(null\b|\{)/.test(match[5])) {
                result.type = result.type || "Object";
            } else if(/^\[/.test(match[5])) {
                result.type = result.type || "Array";
            } else if(/^new\s+Date\b/.test(match[5])) {
                result.type = result.type || "Date";
            } else if(/^\//.test(match[5])) {
                result.type = result.type || "RegExp";
            }
        }

        match = /function\s+([$\w]+)\(/.exec(rest);
        if(match) {
            result.name = result.name || match[1];
        }
    }

    return result;
}

/**
 * 解析 markDown 为 HTML。
 */
function parseMarkDown(content) {

    // 解析内部 @标签
    content = content.replace(/{@(link)\s+([^}]*)\}/g, function(_, key, value){
        return '<a href="' + value + '" target="_blank">' + value + '</a>';
    });

    content = content.replace(/@(null|true|false|undefined|this)/, "<strong>$1</strong>");

    content = content.replace(/@([\w$\.\#]+)/, "<em>$1</em>")

   // content = Markdown.toHTML(content);
   content = Markdown.toHTML(content);
    return content;
}

function parseCode(content) {
    content = content.replace(/^([^\n\t#][^\n]*)$/gm, "<pre>$1</pre>").replace(/<\/pre>\n<pre>/g, "\n");
    content = parseMarkDown(content);
    content = content.replace(/<pre><code>/ig, "<pre>").replace(/<\/code><\/pre>/ig, "<\/pre>")
    return content;
}

/**
 * 表示一个源码读取器。
 */
function SourceReader(source) {
    this.source = source.replace(/\r\n?/g, "\n");
    this.line = this.col = 1;
    this.indent = 0;
    this.pos = -1;
}

SourceReader.prototype = {

    tabSize: 4,

    /**
     * 读取下一个字符。
     */
    read: function () {
        var ch = this.source.charAt(++this.pos);

        // 如果读到 \r 或 \n
        if (ch === '\n') {
            this.line++;
            this.col = 1;
            this.indent = 0;
        } else if (ch === ' ') {
            this.indent++;
        } else if (ch === '\t') {
            this.indent += this.tabSize;
        }
        return ch;
    },

    /**
     * 预览紧跟的字符。
     */
    peek: function (peekCount) {
        return this.source.substr(this.pos, peekCount || 1);
    },

    /**
     * 读取文本直到出现指定字符。
     * @returns {Object} 返回结果对象。
     * - content
     * - line
     * - col
     * - pos
     */
    readTo: function () {
        var ch;
        while (ch = this.read()) {
            for (var i = 0, content, result; i < arguments.length; i++) {
                content = arguments[i];
                if (ch === content.charAt(0) && this.peek(content.length) === content) {
                    result = {
                        content: content,
                        line: this.line,
                        col: this.col,
                        indent: this.indent,
                        pos: this.pos
                    };

                    // 读取标记所在字符。
                    while (this.pos < result.pos + content.length - 1)
                        this.read();

                    return result;
                }
            }
        }
    }

};