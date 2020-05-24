/*! Moment Duration Format v2.0.0b3
 *  https://github.com/jsmreese/moment-duration-format
 *  Date: 2017-11-29
 *
 *  Duration format plugin function for the Moment.js library
 *  http://momentjs.com/
 *
 *  Copyright 2017 John Madhavan-Reese
 *  Released under the MIT license
 */

(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['moment'], factory);
	} else if (typeof exports === 'object') {
		// Node. Does not work with strict CommonJS, but only CommonJS-like
        // enviroments that support module.exports, like Node.
        try {
            module.exports = factory(require('moment'));
        } catch (e) {
            // If moment is not available, leave the setup up to the user.
            // Like when using moment-timezone or similar moment-based package.
            module.exports = factory;
        }
	}

	// Browser globals.
    root.momentDurationFormatSetup = root.moment ? factory(root.moment) : factory;
})(this, function (moment) {
    var engLocale = {
        durations: {
            S: 'millisecond',
            SS: 'milliseconds',
            s: 'second',
            ss: 'seconds',
            m: 'minute',
            mm: 'minutes',
            h: 'hour',
            hh: 'hours',
            d: 'day',
            dd: 'days',
            w: 'week',
            ww: 'weeks',
            M: 'month',
            MM: 'months',
            y: 'year',
            yy: 'years',
            HMS: 'h:mm:ss',
            HM: 'h:mm',
            MS: 'm:ss'
        },
        durationsShort: {
            S: 'msec',
            SS: 'msecs',
            s: 'sec',
            ss: 'secs',
            m: 'min',
            mm: 'mins',
            h: 'hr',
            hh: 'hrs',
            d: 'dy',
            dd: 'dys',
            w: 'wk',
            ww: 'wks',
            M: 'mo',
            MM: 'mos',
            y: 'yr',
            yy: 'yrs'
        }
    };

    var delimiter = / |,|\.|\|/;

	// isArray
	function isArray(array) {
		return Object.prototype.toString.call(array) === "[object Array]";
	}

	// isObject
	function isObject(obj) {
		return Object.prototype.toString.call(obj) === "[object Object]";
	}

	// findLast
	function findLast(array, callback) {
		var index = array.length;

		while (index -= 1) {
			if (callback(array[index])) { return array[index]; }
		}
	}

	// find
	function find(array, callback) {
		var index = 0,
			max = array.length,
			match;

		if (typeof callback !== "function") {
			match = callback;
			callback = function (item) {
				return item === match;
			};
		}

		while (index < max) {
			if (callback(array[index])) { return array[index]; }
			index += 1;
		}
	}

	// each
	function each(array, callback) {
		var index = 0,
			max = array.length;

		if (!array || !max) { return; }

		while (index < max) {
			if (callback(array[index], index) === false) { return; }
			index += 1;
		}
	}

	// map
	function map(array, callback) {
		var index = 0,
			max = array.length,
			ret = [];

		if (!array || !max) { return ret; }

		while (index < max) {
			ret[index] = callback(array[index], index);
			index += 1;
		}

		return ret;
	}

	// pluck
	function pluck(array, prop) {
		return map(array, function (item) {
			return item[prop];
		});
	}

	// compact
	function compact(array) {
		var ret = [];

		each(array, function (item) {
			if (item) { ret.push(item); }
		});

		return ret;
	}

	// unique
	function unique(array) {
		var ret = [];

		each(array, function (_a) {
			if (!find(ret, _a)) { ret.push(_a); }
		});

		return ret;
	}

	// intersection
	function intersection(a, b) {
		var ret = [];

		each(a, function (_a) {
			each(b, function (_b) {
				if (_a === _b) { ret.push(_a); }
			});
		});

		return unique(ret);
	}

	// rest
	function rest(array, callback) {
		var ret = [];

		each(array, function (item, index) {
			if (!callback(item)) {
				ret = array.slice(index);
				return false;
			}
		});

		return ret;
	}

	// initial
	function initial(array, callback) {
		var reversed = array.slice().reverse();

		return rest(reversed, callback).reverse();
	}

	// extend
	function extend(a, b) {
		for (var key in b) {
			if (b.hasOwnProperty(key)) { a[key] = b[key]; }
		}

		return a;
	}

    // any
	function any(array, callback) {
		var index = 0,
			max = array.length;

		if (!array || !max) { return false; }

		while (index < max) {
			if (callback(array[index], index) === true) { return true; }
			index += 1;
		}

        return false;
	}


	// durationFormat([template] [, precision] [, settings])
	function durationFormat() {

		var args = [].slice.call(arguments);
        var settings = extend({}, this.format.defaults);

		// Keep a shadow copy of this moment for calculating remainders.
        // Perform all calculations on positive duration value, handle negative
        // sign at the very end.
        var asMilliseconds = this.asMilliseconds();
        var isNegative = asMilliseconds < 0;
        var remainder = moment.duration(Math.abs(asMilliseconds), "milliseconds");

        // Parse arguments.
		each(args, function (arg) {
			if (typeof arg === "string" || typeof arg === "function") {
				settings.template = arg;
				return;
			}

			if (typeof arg === "number") {
				settings.precision = arg;
				return;
			}

			if (isObject(arg)) {
				extend(settings, arg);
			}
		});

        var momentTokens = {
            years: "y",
			months: "M",
			weeks: "w",
			days: "d",
			hours: "h",
			minutes: "m",
			seconds: "s",
			milliseconds: "S"
        };

        var tokenDefs = {
            escape: /\[(.+?)\]/,
            years: /\*?[Yy]+/,
            months: /\*?M+/,
            weeks: /\*?[Ww]+/,
            days: /\*?[Dd]+/,
            hours: /\*?[Hh]+/,
            minutes: /\*?m+/,
            seconds: /\*?s+/,
            milliseconds: /\*?S+/,
            general: /.+?/
        };

		// Token type names in order of descending magnitude.
		var types = "escape years months weeks days hours minutes seconds milliseconds general".split(" ");

        // Types array is available in the template function.
        settings.types = types;

		var typeMap = function (token) {
			return find(types, function (type) {
				return tokenDefs[type].test(token);
			});
		};

		var tokenizer = new RegExp(map(types, function (type) {
			return tokenDefs[type].source;
		}).join("|"), "g");

        // Current duration object is available in the template function.
		settings.duration = this;

        // Eval template function and cache template string.
        var template = typeof settings.template === "function" ? settings.template.apply(settings) : settings.template;

        var largest = settings.largest;

        // Setup stopTrim array of token types.
        var stopTrim = [];

        if (!largest) {
            if (isArray(settings.stopTrim)) {
                settings.stopTrim = settings.stopTrim.join("");
            }

            // Parse stopTrim string to create token types array.
            if (settings.stopTrim) {
                each(settings.stopTrim.match(tokenizer), function (token) {
                    var type = typeMap(token);

                    if (type === "escape" || type === "general") {
                        return;
                    }

                    stopTrim.push(type);
                });
            }
        }

        // Cache moment's locale data, fall back to this plugin's `eng` extension.
        var localeData = moment.localeData();
        if (!localeData._durations || !localeData._durationsShort) {
            localeData = {
                _durations: engLocale.durations,
                _durationsShort: engLocale.durationsShort
            };
        }

        // Determine user's locale.
        var userLocale = settings.userLocale || window.navigator.userLanguage || window.navigator.language;

        var useLeftUnits = settings.useLeftUnits;
        var useSingular = settings.useSingular;
        var precision = settings.precision;
        var forceLength = settings.forceLength;
        var minValue = settings.minValue;
        var maxValue = settings.maxValue;
        var useGrouping = settings.useGrouping;
        var trunc = settings.trunc;

        // Use significant digits only when precision is greater than 0.
        var useSignificantDigits = settings.useSignificantDigits && precision > 0;
        var significantDigits = useSignificantDigits ? settings.precision : 0;

        // Trim options.
        var trim = settings.trim;

        if (isArray(trim)) {
            trim = trim.join(" ");
        }

        if (trim === true || trim === "left" || trim === "right") {
            trim = "large";
        }

        if (trim === false) {
            trim = "";
        }

        if (largest) {
            trim = "all";
        }

        var trimIncludes = function (item) {
            return item.test(trim);
        }

        var rLarge = /large/;
        var rSmall = /small/;
        var rBoth = /both/;
        var rMid = /mid/;
        var rAll = /^all|[^sm]all/;
        var rFinal = /final/;

        var trimLarge = any([rLarge, rBoth, rAll], trimIncludes);
        var trimSmall = any([rSmall, rBoth, rAll], trimIncludes);
        var trimMid = any([rMid, rAll], trimIncludes);
        var trimFinal = any([rFinal, rAll], trimIncludes);

        // Replace _HMS_, _HM_, and _MS_ strings.
        each(["HMS", "HM", "MS"], function (item) {
            template = template.replace("_" + item+ "_", localeData._durations[item]);
        });

		// Parse format string to create raw tokens array.
		var rawTokens = map(template.match(tokenizer), function (token, index) {
			var type = typeMap(token);

			if (token.slice(0, 1) === "*") {
				token = token.slice(1);

                if (!largest && type !== "escape" && type !== "general") {
                    stopTrim.push(type);
                }
			}

			return {
				index: index,
				length: token.length,
                text: "",

				// Replace escaped tokens with the non-escaped token text.
				token: (type === "escape" ? token.replace(tokenDefs.escape, "$1") : token),

				// Ignore type on non-moment tokens.
				type: ((type === "escape" || type === "general") ? null : type)
			};
		});

        // Associate text tokens with moment tokens.
        var currentToken = {
            index: 0,
            length: 0,
            token: "",
            text: "",
            type: null
        };

        var tokens = [];

        if (useLeftUnits) {
            rawTokens.reverse();
        }

        each(rawTokens, function (token) {
            if (token.type) {
                if (currentToken.type || currentToken.text) {
                    tokens.push(currentToken);
                }

                currentToken = token;

                return;
            }

            if (useLeftUnits) {
                currentToken.text = token.token + currentToken.text;
            } else {
                currentToken.text += token.token;
            }
        });

        if (currentToken.type || currentToken.text) {
            tokens.push(currentToken);
        }

        if (useLeftUnits) {
            tokens.reverse();
        }

		// Find unique moment token types in the template in order of
        // descending magnitude.
		var momentTypes = intersection(types, unique(compact(pluck(tokens, "type"))));

		// Exit early if there are no moment token types.
		if (!momentTypes.length) {
			return pluck(tokens, "text").join("");
		}

		// Calculate values for each moment type in the template.
        // For processing the settings, values are associated with moment types.
        // Values will be assigned to tokens at the last step in order to
        // assume nothing about frequency or order of tokens in the template.
		momentTypes = map(momentTypes, function (momentType, index) {
			// Is this the least-magnitude moment token found?
			var isSmallest = ((index + 1) === momentTypes.length);

			// Is this the greatest-magnitude moment token found?
			var isLargest = (!index);

			// Get the raw value in the current units.
			var rawValue = remainder.as(momentType);

			var wholeValue = Math.floor(rawValue);
			var decimalValue = rawValue - wholeValue;

            var token = find(tokens, function (token) {
                return momentType === token.type;
            });

            // Note the length of the largest-magnitude moment token:
            // if it is greater than one and forceLength is not set,
            // then default forceLength to `true`.
            //
            // Rationale is this: If the template is "h:mm:ss" and the
            // moment value is 5 minutes, the user-friendly output is
            // "5:00", not "05:00". We shouldn't pad the `minutes` token
            // even though it has length of two if the template is "h:mm:ss";
            //
            // If the minutes output should always include the leading zero
            // even when the hour is trimmed then set `{ forceLength: true }`
            // to output "05:00". If the template is "hh:mm:ss", the user
            // clearly wanted everything padded so we should output "05:00";
            //
            // If the user wants the full padded output, they can use
            // template "hh:mm:ss" and set `{ trim: false }` to output
            // "00:05:00".
            if (isLargest && forceLength == null && token.length > 1) {
                forceLength = true;
            }

			// Update remainder.
			remainder.subtract(wholeValue, momentType);

            return {
                rawValue: rawValue,
                wholeValue: wholeValue,
                // Decimal value is only retained for the least-magnitude
                // moment type in the format template.
                decimalValue: isSmallest ? decimalValue : 0,
                isSmallest: isSmallest,
                isLargest: isLargest,
                type: momentType,
                // Tokens can appear multiple times in a template string,
                // but all instances must share the same length.
                tokenLength: token.length
            };
		});

        // Trim Large.
        if (trimLarge) {
            momentTypes = rest(momentTypes, function (momentType) {
                // Stop trimming on:
                // - the smallest moment type
                // - a type marked for stopTrim
                // - a type that has a whole value
                return !momentType.isSmallest && !momentType.wholeValue && !find(stopTrim, momentType.type);
            });
        }

        // Trim Small.
        if (trimSmall && momentTypes.length > 1) {
            momentTypes = initial(momentTypes, function (momentType) {
                // Stop trimming on:
                // - a type marked for stopTrim
                // - a type that has a whole value
                // - the largest momentType
                return !momentType.wholeValue && !find(stopTrim, momentType.type) && !momentType.isLargest;
            });
        }

        // Trim Mid.
        if (trimMid) {
            momentTypes = map(momentTypes, function (momentType, index) {
                if (index > 0 && index < momentTypes.length - 1 && !momentType.wholeValue) {
                    return null;
                }

                return momentType;
            });

            momentTypes = compact(momentTypes);
        }

        // Trim Final.
        if (trimFinal && momentTypes.length === 1 && !momentTypes[0].wholeValue && !(!trunc && momentTypes[0].isSmallest && momentTypes[0].rawValue < minValue)) {
            momentTypes = [];
        }

        // Max Value.
        if (maxValue && momentTypes.length && momentTypes[0].isLargest && momentTypes[0].rawValue > maxValue) {
            momentTypes = momentTypes.slice(0, 1);
            momentTypes[0].isMaxValue = true;
        }

        // Min Value.
        if (minValue && momentTypes.length === 1 && momentTypes[0].isSmallest && momentTypes[0].rawValue < minValue) {
            momentTypes[0].isMinValue = true;
        }

        // Largest.
        if (largest && momentTypes.length) {
            momentTypes = momentTypes.slice(0, largest);
        }

        // Calculate formatted values.
        var truncMethod = trunc ? Math.floor : Math.round;

        momentTypes = map(momentTypes, function (momentType, index) {
            var localeStringOptions = {
                useGrouping: useGrouping
            };

            if (useSignificantDigits) {
                if (significantDigits <= 0) {
                    return null;
                }

                localeStringOptions.maximumSignificantDigits = significantDigits;
            }

            if (momentType.isMaxValue) {
                momentType.value = maxValue;
            } else if (momentType.isMinValue) {
                momentType.value = minValue;
            } else if (momentType.isSmallest) {
                // Apply precision to least significant token value.
                if (precision < 0) {
                    momentType.value = truncMethod(momentType.wholeValue * Math.pow(10, precision)) * Math.pow(10, -precision);
                } else if (precision === 0) {
                    momentType.value = truncMethod(momentType.wholeValue + momentType.decimalValue);
                } else { // precision > 0
                    if (useSignificantDigits) {
                        if (trunc) {
                            momentType.value = truncMethod((momentType.wholeValue + momentType.decimalValue) * Math.pow(10, (significantDigits - momentType.wholeValue.toString().length))) * Math.pow(10, -(significantDigits - momentType.wholeValue.toString().length));
                        } else {
                            momentType.value = momentType.wholeValue + momentType.decimalValue;
                        }
                    } else {
                        localeStringOptions.minimumFractionDigits = precision;
                        localeStringOptions.maximumFractionDigits = precision;

                        if (trunc) {
                            momentType.value = momentType.wholeValue + truncMethod(momentType.decimalValue * Math.pow(10, precision)) * Math.pow(10, -precision);
                        } else {
                            momentType.value = momentType.wholeValue + momentType.decimalValue;
                        }
                    }
                }
            } else {
                if (useSignificantDigits) {
                    // Outer Math.round required here to handle floating point errors.
                    momentType.value = Math.round(truncMethod(momentType.wholeValue * Math.pow(10, (significantDigits - momentType.wholeValue.toString().length))) * Math.pow(10, -(significantDigits - momentType.wholeValue.toString().length)));

                    significantDigits -= momentType.wholeValue.toString().length;
                } else {
                    momentType.value = momentType.wholeValue;
                }
            }

            if (momentType.tokenLength > 1 && (index || momentType.isLargest || forceLength)) {
                localeStringOptions.minimumIntegerDigits = momentType.tokenLength;
            }

            momentType.formattedValue = momentType.value.toLocaleString(userLocale, localeStringOptions);

            momentType.formattedValueEnUS = momentType.value.toLocaleString("en-US", localeStringOptions);

            if (momentType.tokenLength === 2 && momentType.type === "milliseconds") {
                momentType.formattedValueMS = momentType.value.toLocaleString("en-US", {
                    minimumIntegerDigits: 3,
                    useGrouping: false
                }).slice(0, 2);
            }

            return momentType;
        });

        momentTypes = compact(momentTypes);

        // Localize and singularize/pluralize unit labels.
        each(tokens, function (token) {
            var key = momentTokens[token.type] || "";

            if (!key) {
                return;
            }

            var labels = {
                single: localeData._durations[key],
                plural: localeData._durations[key + key],
                singleShort: localeData._durationsShort[key],
                pluralShort: localeData._durationsShort[key + key]
            };

            token.text = token.text
                              .replace("__", labels.plural)
                              .replace("_", labels.pluralShort);

            var momentType = find(momentTypes, function (momentType) {
                return momentType.type === token.type;
            });

            if (!momentType) {
                return;
            }

            // This should support plural rules, etc., and not rely on
            // the en-US formatted value.
            if (useSingular && momentType.formattedValueEnUS === "1") {
                if (labels.plural && labels.single) {
                    token.text = token.text.replace(labels.plural, labels.single);
                }

                if (labels.pluralShort && labels.singleShort) {
                    token.text = token.text.replace(labels.pluralShort, labels.singleShort);
                }
            }
        });

        // Build ouptut.
        tokens = map(tokens, function (token) {
            if (!token.type) {
                return token.text;
            }

            var momentType = find(momentTypes, function (momentType) {
                return momentType.type === token.type;
            });

            if (!momentType) {
                return "";
            }

            var out = "";

            if (useLeftUnits) {
                out += token.text;
            }

            if (isNegative && momentType.isMaxValue || !isNegative && momentType.isMinValue) {
                out += "< ";
            }

            if (isNegative && momentType.isMinValue || !isNegative && momentType.isMaxValue) {
                out += "> "
            }

            if (isNegative && momentType.value > 0) {
                out += "-";
            }

            isNegative = false;

            if (token.type === "milliseconds" && momentType.formattedValueMS) {
                out += momentType.formattedValueMS;
            } else {
                out += momentType.formattedValue;
            }

            if (!useLeftUnits) {
                out += token.text;
            }

            return out;
        });

        // Trim leading and trailing comma, space, colon, and dot.
        return tokens.join("").replace(/(,| |:|\.)*$/, "").replace(/^(,| |:|\.)*/, "");
    }

//////////////////////////////////////////////////////////////////////////




/*		// Build output.

		// The first moment token can have special handling.
		var foundFirst = false;

        var truncMethod = settings.trunc ? Math.floor : Math.round;

		tokens = map(tokens, function (token, index) {

            // Output token text if this is not a moment token.
			if (!token.type) {
				return token.text;
			}

            var localeStringOptions = {
                useGrouping: settings.useGrouping
            };

            if (useSignificantDigits) {
                if (significantDigits <= 0) {
                    return "";
                }

                localeStringOptions.maximumSignificantDigits = significantDigits;
            }

            if (token.isLeast) {
                // Apply precision to least significant token value.
                if (settings.precision < 0) {
                    token.wholeValue = truncMethod(token.wholeValue * Math.pow(10, settings.precision)) * Math.pow(10, -settings.precision);
                    token.decimalValue = 0;
                } else if (settings.precision === 0) {
                    token.wholeValue = truncMethod(token.wholeValue + token.decimalValue);
                    token.decimalValue = 0;
                } else { // settings.precision > 0
                    if (useSignificantDigits) {
                        if (settings.trunc) {
                            token.wholeValue = truncMethod((token.wholeValue + token.decimalValue) * Math.pow(10, (significantDigits - token.wholeValue.toString().length))) * Math.pow(10, -(significantDigits - token.wholeValue.toString().length));
                            token.decimalValue = 0;
                        }
                    } else {
                        localeStringOptions.minimumFractionDigits = settings.precision;
                        localeStringOptions.maximumFractionDigits = settings.precision;

                        if (settings.trunc) {
                            token.decimalValue = truncMethod(token.decimalValue * Math.pow(10, settings.precision)) * Math.pow(10, -settings.precision);
                        }
                    }
                }
            } else {
                token.decimalValue = 0;

                if (useSignificantDigits) {
                    // Outer Math.round required here to handle floating point errors.
                    token.wholeValue = Math.round(truncMethod(token.wholeValue * Math.pow(10, (significantDigits - token.wholeValue.toString().length))) * Math.pow(10, -(significantDigits - token.wholeValue.toString().length)));

                    significantDigits -= token.wholeValue.toString().length;
                }
            }

            if (token.length > 1 && (foundFirst || token.isMost || settings.forceLength)) {
                localeStringOptions.minimumIntegerDigits = token.length;
            }

            foundFirst = true;

            // Output a negative sign for the first moment token.
            var out = token.isNegative && (!index || token.isMost) && (token.wholeValue + token.decimalValue < 0) ? "-" : "";

            out += Math.abs(token.wholeValue + token.decimalValue).toLocaleString(userLocale, localeStringOptions);

			return (useLeftUnits ? token.text + out : out + token.text);
		});

        // Trim leading and trailing comma, space, colon, and dot.
        return tokens.join("").replace(/(,| |:|\.)*$/, "").replace(/^(,| |:|\.)* /, "");
	}
*/
	// defaultFormatTemplate
	function defaultFormatTemplate() {
        var dur = this.duration;

        var findType = function findType(type) {
    		return dur._data[type];
        }

        var firstType = find(this.types, findType);

        var lastType = findLast(this.types, findType);

		// Default template strings for each duration dimension type.
		switch (firstType) {
            case "milliseconds":
                return "S __"
			case "seconds": // fallthrough
			case "minutes":
				return "*_MS_";
			case "hours":
				return "_HMS_";
			case "days": // fallthrough
                if (firstType === lastType) {
                    return "d __";
                }
			case "weeks": // possible fallthrough
                if (firstType === lastType) {
                    return "w __";
                }

                this.trim = "both";
                return "w __, d __, h __";
			case "months":
                if (firstType === lastType) {
                    return "M __";
                }
			case "years": // possible fallthrough
                if (firstType === lastType) {
                    return "y __";
                }

                this.trim = "both";
                return "y __, M __, d __"
			default:
                this.trim = "both";
				return "y __, d __, h __, m __, s __";
		}
	}

	// init
	function init(context) {
		if (!context) {
			throw "Moment Duration Format init cannot find moment instance.";
		}

		context.duration.fn.format = durationFormat;

		context.duration.fn.format.defaults = {

			// trim
            // Can be a string, a delimited list of strings, an array of strings,
            // or a boolean.
            // "large" - will trim largest-magnitude zero-value tokens until finding a token with a value, a token identified as 'stopTrim', or the final token of the format string.
            // "small" - will trim smallest-magnitude zero-value tokens until finding a token with a value, a token identified as 'stopTrim', or the final token of the format string.
            // "both" - will execute "large" trim then "small" trim.
            // "mid" - will trim any zero-value tokens that are not the first or last tokens. Usually used in conjunction with "large" or "both". e.g. "large mid" or "both mid".
            // "final" - will trim the final token if it is zero-value. Use this option with "large" or "both" to output an empty string when formatting a zero-value duration. e.g. "large final" or "both final".
            // "all" - Will trim all zero-value tokens. Shorthand for "both mid final".
			// "left" - maps to "large" to support plugin's version 1 API.
			// "right" - maps to "large" to support plugin's version 1 API.
            // `false` - template tokens are not trimmed.
            // `true` - treated as "large".
			trim: "largest",

            // stopTrim
            // A moment token string, a delimited set of moment token strings,
            // or an array of moment token strings. Trimming will stop when a token
            // listed in this option is reached. A "*" character in the format
            // template string will also mark a moment token as stopTrim.
            // e.g. "d [days] *h:mm:ss" will always stop trimming at the 'hours' token.
            stopTrim: null,

            // largest
            // Set to a positive integer to output only the "n" largest-magnitude
            // moment tokens that have a value. All lesser-magnitude moment tokens
            // will be ignored. This option takes effect even if `trim` is set
            // to `false`.
            largest: null,

            // maxValue
            // Use `maxValue` to render generalized output for large duration values,
            // e.g. `"> 60 days"`. `maxValue` must be a positive integer and is
            /// applied to the greatest-magnitude moment token in the format template.
            maxValue: null,

            // minValue
            // Use `minValue` to render generalized output for small duration values,
            // e.g. `"< 5 minutes"`. `minValue` must be a positive integer and is
            // applied to the least-magnitude moment token in the format template.
            minValue: null,

			// precision
			// If a positive integer, number of decimal fraction digits to render.
			// If a negative integer, number of integer place digits to truncate to 0.
            // If `useSignificantDigits` is set to `true` and `precision` is a positive
            // integer, sets the maximum number of significant digits used in the
            // formatted output.
			precision: 0,

			// trunc
			// Default behavior rounds final token value. Set to `true` to
            // truncate final token value, which was the default behavior in
            // version 1 of this plugin.
			trunc: false,

            // forceLength
			// Force first moment token with a value to render at full length
            // even when template is trimmed and first moment token has length of 1.
			// Defaulted to `null` to distinguish between 'not set' and 'set to `false`'
			forceLength: null,

            // userLocale
            // Formatted numerical output is rendered using `toLocaleString`
            // and the locale of the user's environment. Set this option to render
            // numerical output using a different locale. Unit names are rendered
            // and detected using the locale set in moment.js, which can be different
            // from the locale of user's environment.
            userLocale: null,

            // useSingular
            // Will automatically singularize unit names when they appear in the
            // text associated with each moment token. Long and short unit names
            // are singularized, based on locale. e.g. in english, "1 second" or
            // "1 sec" would be rendered instead of "1 seconds" or "1 secs". This
            // option is disabled when a value is rendered with decimal precision.
            // e.g. "1.0 seconds" is never rendered as "1.0 second".
            useSingular: true,

            // useLeftUnits
            // The text to the right of each moment token in a format string
            // is treated as that token's units for the purposes of trimming,
            // singularizing, and auto-localizing.
            // e.g. "h [hours], m [minutes], s [seconds]".
            // To properly singularize or localize a format string such as
            // "[hours] h, [minutes] m, [seconds] s", where the units appear
            // to the left of each moment token, set useLeftUnits to `true`.
            // This plugin is not tested in the context of rtl text.
            useLeftUnits: false,

            // useGrouping
            // Enables locale-based digit grouping in the formatted output. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString
            useGrouping: true,

            // useSignificantDigits
            // Treat the `precision` option as the maximum significant digits
            // to be rendered. Precision must be a positive integer. Significant
            // digits extend across unit types,
            // e.g. "6 hours 37.5 minutes" represents 4 significant digits.
            // Enabling this option causes token length to be ignored. See  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString
            useSignificantDigits: false,

			// template
            // The template string used to format the duration. May be a function
            // or a string. Template functions are executed with the `this` binding
            // of the settings object so that template strings may be dynamically
            // generated based on the duration object (accessible via `this.duration`)
            // or any of the other settings. Leading and trailing space, comma,
            // period, and colon characters are trimmed from the resulting string.
			template: defaultFormatTemplate
		};

        context.updateLocale('en', engLocale);
	}

	// Initialize duration format on the global moment instance.
	init(moment);

	// Return the init function so that duration format can be
	// initialized on other moment instances.
	return init;
});