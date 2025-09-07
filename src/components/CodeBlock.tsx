import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Code, 
  Copy, 
  Check, 
  AlertTriangle, 
  Play,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language: string;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  isEditing?: boolean;
  onToggleEdit?: () => void;
}

interface CodeError {
  line: number;
  message: string;
  type: 'error' | 'warning';
}

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', ext: 'js' },
  { value: 'typescript', label: 'TypeScript', ext: 'ts' },
  { value: 'python', label: 'Python', ext: 'py' },
  { value: 'java', label: 'Java', ext: 'java' },
  { value: 'cpp', label: 'C++', ext: 'cpp' },
  { value: 'c', label: 'C', ext: 'c' },
  { value: 'rust', label: 'Rust', ext: 'rs' },
  { value: 'go', label: 'Go', ext: 'go' },
  { value: 'php', label: 'PHP', ext: 'php' },
  { value: 'ruby', label: 'Ruby', ext: 'rb' },
  { value: 'swift', label: 'Swift', ext: 'swift' },
  { value: 'kotlin', label: 'Kotlin', ext: 'kt' },
  { value: 'sql', label: 'SQL', ext: 'sql' },
  { value: 'bash', label: 'Bash', ext: 'sh' },
  { value: 'json', label: 'JSON', ext: 'json' },
  { value: 'yaml', label: 'YAML', ext: 'yml' },
  { value: 'xml', label: 'XML', ext: 'xml' },
  { value: 'css', label: 'CSS', ext: 'css' },
  { value: 'html', label: 'HTML', ext: 'html' },
  { value: 'markdown', label: 'Markdown', ext: 'md' }
];

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  onCodeChange,
  onLanguageChange,
  isEditing = false,
  onToggleEdit
}) => {
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<CodeError[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectedLanguage = SUPPORTED_LANGUAGES.find(lang => lang.value === language) || SUPPORTED_LANGUAGES[0];

  // Basic syntax error detection for common languages
  const analyzeCode = async (code: string, language: string) => {
    if (!code.trim()) {
      setErrors([]);
      return;
    }

    setIsAnalyzing(true);
    const foundErrors: CodeError[] = [];

    try {
      // Basic static analysis for common syntax errors
      const lines = code.split('\n');
      
      switch (language) {
        case 'javascript':
        case 'typescript':
          analyzeJavaScript(lines, foundErrors);
          break;
        case 'python':
          analyzePython(lines, foundErrors);
          break;
        case 'java':
          analyzeJava(lines, foundErrors);
          break;
        case 'json':
          analyzeJSON(code, foundErrors);
          break;
        default:
          // Generic analysis
          analyzeGeneric(lines, foundErrors);
          break;
      }
    } catch (error) {
      console.error('Error analyzing code:', error);
    }

    setErrors(foundErrors);
    setIsAnalyzing(false);
  };

  const analyzeJavaScript = (lines: string[], errors: CodeError[]) => {
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Check for common syntax issues
      if (trimmed.includes('console.log(') && !trimmed.includes(');')) {
        if (!trimmed.endsWith(')')) {
          errors.push({
            line: index + 1,
            message: 'Missing closing parenthesis for console.log',
            type: 'error'
          });
        }
      }

      // Check for missing semicolons (basic)
      if (trimmed.match(/^(let|const|var)\s+\w+\s*=.*[^;{]$/) && !trimmed.includes('//')) {
        errors.push({
          line: index + 1,
          message: 'Consider adding semicolon',
          type: 'warning'
        });
      }

      // Check for unmatched brackets
      const openBrackets = (trimmed.match(/\{/g) || []).length;
      const closeBrackets = (trimmed.match(/\}/g) || []).length;
      if (openBrackets !== closeBrackets && trimmed.includes('{')) {
        errors.push({
          line: index + 1,
          message: 'Unmatched brackets',
          type: 'error'
        });
      }
    });
  };

  const analyzePython = (lines: string[], errors: CodeError[]) => {
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Check for indentation issues (basic)
      if (trimmed.startsWith('def ') && !trimmed.endsWith(':')) {
        errors.push({
          line: index + 1,
          message: 'Function definition should end with colon',
          type: 'error'
        });
      }

      if (trimmed.startsWith('if ') && !trimmed.endsWith(':')) {
        errors.push({
          line: index + 1,
          message: 'If statement should end with colon',
          type: 'error'
        });
      }

      // Check for print statement issues
      if (trimmed.includes('print(') && !trimmed.includes(')')) {
        errors.push({
          line: index + 1,
          message: 'Missing closing parenthesis for print',
          type: 'error'
        });
      }
    });
  };

  const analyzeJava = (lines: string[], errors: CodeError[]) => {
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Check for missing semicolons
      if (trimmed.match(/^(int|String|boolean|double|float)\s+\w+.*[^;{]$/) && !trimmed.includes('//')) {
        errors.push({
          line: index + 1,
          message: 'Missing semicolon',
          type: 'error'
        });
      }

      // Check for class declaration
      if (trimmed.startsWith('public class ') && !trimmed.includes('{')) {
        errors.push({
          line: index + 1,
          message: 'Class declaration should have opening brace',
          type: 'error'
        });
      }
    });
  };

  const analyzeJSON = (code: string, errors: CodeError[]) => {
    try {
      JSON.parse(code);
    } catch (error) {
      errors.push({
        line: 1,
        message: 'Invalid JSON syntax',
        type: 'error'
      });
    }
  };

  const analyzeGeneric = (lines: string[], errors: CodeError[]) => {
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Check for unmatched parentheses
      const openParens = (trimmed.match(/\(/g) || []).length;
      const closeParens = (trimmed.match(/\)/g) || []).length;
      if (openParens !== closeParens && (openParens > 0 || closeParens > 0)) {
        errors.push({
          line: index + 1,
          message: 'Unmatched parentheses',
          type: 'warning'
        });
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      analyzeCode(code, language);
    }, 1000); // Debounce analysis

    return () => clearTimeout(timer);
  }, [code, language]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const errorCount = errors.filter(e => e.type === 'error').length;
  const warningCount = errors.filter(e => e.type === 'warning').length;

  return (
    <div className="rounded-lg border border-code-border bg-code-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-code-border">
        <div className="flex items-center gap-3">
          <Code className="h-4 w-4 text-muted-foreground" />
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger className="w-40 h-7 bg-transparent border-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {selectedLanguage.ext}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Error indicators */}
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {errorCount} errors
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="text-xs text-warning">
              {warningCount} warnings
            </Badge>
          )}
          
          {isAnalyzing && (
            <Badge variant="outline" className="text-xs">
              Analyzing...
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-7 w-7 p-0"
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>

          {onToggleEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleEdit}
              className="h-7 w-7 p-0"
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Code content */}
      <div className="relative">
        {isEditing ? (
          <Textarea
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            className="font-mono text-sm bg-code-bg border-none resize-none min-h-32 focus-visible:ring-0"
            placeholder={`Enter ${selectedLanguage.label} code...`}
          />
        ) : (
          <div className="relative">
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1rem',
                background: 'transparent',
                fontSize: '0.875rem',
                lineHeight: '1.5'
              }}
              showLineNumbers
              lineNumberStyle={{
                color: 'hsl(var(--muted-foreground))',
                paddingRight: '1rem',
                minWidth: '2rem'
              }}
            >
              {code || `// Enter ${selectedLanguage.label} code here...`}
            </SyntaxHighlighter>

            {/* Error overlay */}
            {errors.length > 0 && (
              <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                {errors.map((error, index) => (
                  <div
                    key={index}
                    className={cn(
                      "absolute left-0 right-0 border-l-2 bg-opacity-10",
                      error.type === 'error' 
                        ? "border-destructive bg-destructive" 
                        : "border-warning bg-warning"
                    )}
                    style={{
                      top: `${(error.line - 1) * 1.5 + 1}rem`,
                      height: '1.5rem'
                    }}
                    title={error.message}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error list */}
      {errors.length > 0 && (
        <div className="border-t border-code-border bg-muted/20 p-3">
          <div className="space-y-1 max-h-24 overflow-auto">
            {errors.map((error, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  error.type === 'error' ? "text-destructive" : "text-warning"
                )}
              >
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                <span className="font-mono">Line {error.line}:</span>
                <span>{error.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};