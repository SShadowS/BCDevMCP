import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

const generateALSchema = {
  objectType: z.enum(["table", "page", "codeunit", "report", "query", "xmlport", "enum"]).describe("Type of AL object to generate"),
  objectId: z.number().describe("Object ID"),
  objectName: z.string().describe("Object name (without spaces)"),
  targetPath: z.string().describe("Target file path for the generated AL file"),
  fields: z.array(z.object({
    id: z.number(),
    name: z.string(),
    dataType: z.string(),
    length: z.number().optional()
  })).optional().describe("Fields for table objects"),
  template: z.enum(["basic", "card", "list", "document", "journal"]).optional().describe("Template type for pages")
};

export function registerGenerateALTool(server: McpServer): void {
  server.registerTool(
    "generate-al",
    {
      title: "Generate AL Code",
      description: "Generate AL code for Business Central objects from templates",
      inputSchema: generateALSchema
    },
    async ({ objectType, objectId, objectName, targetPath, fields, template = "basic" }) => {
      try {
        // Ensure target directory exists
        await mkdir(dirname(targetPath), { recursive: true });
        
        let content = "";
        
        switch (objectType) {
          case "table":
            content = generateTable(objectId, objectName, fields || []);
            break;
          case "page":
            content = generatePage(objectId, objectName, template);
            break;
          case "codeunit":
            content = generateCodeunit(objectId, objectName);
            break;
          case "report":
            content = generateReport(objectId, objectName);
            break;
          case "query":
            content = generateQuery(objectId, objectName);
            break;
          case "xmlport":
            content = generateXMLPort(objectId, objectName);
            break;
          case "enum":
            content = generateEnum(objectId, objectName);
            break;
        }
        
        await writeFile(targetPath, content, 'utf8');
        
        return {
          content: [{
            type: "text",
            text: `Successfully generated ${objectType} '${objectName}' (ID: ${objectId})\nFile created at: ${targetPath}\n\nGenerated code:\n\n${content}`
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Failed to generate AL code: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );
}

function generateTable(id: number, name: string, fields: any[]): string {
  const fieldsCode = fields.map(field => {
    const dataType = field.length 
      ? `${field.dataType}[${field.length}]`
      : field.dataType;
    
    return `
        field(${field.id}; "${field.name}"; ${dataType})
        {
            Caption = '${field.name}';
            DataClassification = ToBeClassified;
        }`;
  }).join('\n');

  return `table ${id} "${name}"
{
    Caption = '${name}';
    DataClassification = ToBeClassified;
    
    fields
    {
        field(1; "Code"; Code[20])
        {
            Caption = 'Code';
            DataClassification = ToBeClassified;
        }
        
        field(2; Description; Text[100])
        {
            Caption = 'Description';
            DataClassification = ToBeClassified;
        }${fields.length > 0 ? '\n' + fieldsCode : ''}
    }
    
    keys
    {
        key(PK; "Code")
        {
            Clustered = true;
        }
    }
    
    trigger OnInsert()
    begin
    end;
    
    trigger OnModify()
    begin
    end;
    
    trigger OnDelete()
    begin
    end;
}`;
}

function generatePage(id: number, name: string, template: string): string {
  const sourceTable = `"${name}"`;
  
  if (template === "list") {
    return `page ${id} "${name} List"
{
    Caption = '${name} List';
    PageType = List;
    SourceTable = ${sourceTable};
    UsageCategory = Lists;
    ApplicationArea = All;
    
    layout
    {
        area(Content)
        {
            repeater(Group)
            {
                field("Code"; Rec."Code")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the code.';
                }
                
                field(Description; Rec.Description)
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the description.';
                }
            }
        }
    }
    
    actions
    {
        area(Processing)
        {
            action(New)
            {
                Caption = 'New';
                ApplicationArea = All;
                Image = New;
                
                trigger OnAction()
                begin
                    // Add new record logic
                end;
            }
        }
    }
}`;
  } else {
    return `page ${id} "${name} Card"
{
    Caption = '${name} Card';
    PageType = Card;
    SourceTable = ${sourceTable};
    UsageCategory = Documents;
    ApplicationArea = All;
    
    layout
    {
        area(Content)
        {
            group(General)
            {
                Caption = 'General';
                
                field("Code"; Rec."Code")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the code.';
                    
                    trigger OnValidate()
                    begin
                        // Add validation logic
                    end;
                }
                
                field(Description; Rec.Description)
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the description.';
                }
            }
        }
    }
    
    actions
    {
        area(Processing)
        {
            action(Post)
            {
                Caption = 'Post';
                ApplicationArea = All;
                Image = Post;
                Promoted = true;
                PromotedCategory = Process;
                
                trigger OnAction()
                begin
                    // Add posting logic
                end;
            }
        }
    }
}`;
  }
}

function generateCodeunit(id: number, name: string): string {
  return `codeunit ${id} "${name}"
{
    trigger OnRun()
    begin
    end;
    
    procedure MyProcedure()
    begin
        // Add your code here
    end;
    
    local procedure LocalProcedure()
    begin
        // Add local procedure logic
    end;
    
    var
        myInt: Integer;
}`;
}

function generateReport(id: number, name: string): string {
  return `report ${id} "${name}"
{
    Caption = '${name}';
    UsageCategory = ReportsAndAnalysis;
    ApplicationArea = All;
    DefaultRenderingLayout = RDLCLayout;
    
    dataset
    {
        dataitem(DataItemName; "Table Name")
        {
            column(ColumnName; FieldName)
            {
                // Column properties
            }
            
            trigger OnAfterGetRecord()
            begin
                // Process each record
            end;
        }
    }
    
    requestpage
    {
        layout
        {
            area(Content)
            {
                group(Options)
                {
                    Caption = 'Options';
                    
                    field(ShowDetails; ShowDetails)
                    {
                        Caption = 'Show Details';
                        ApplicationArea = All;
                    }
                }
            }
        }
    }
    
    rendering
    {
        layout(RDLCLayout)
        {
            Type = RDLC;
            LayoutFile = '${name}.rdlc';
        }
    }
    
    var
        ShowDetails: Boolean;
}`;
}

function generateQuery(id: number, name: string): string {
  return `query ${id} "${name}"
{
    Caption = '${name}';
    QueryType = Normal;
    
    elements
    {
        dataitem(DataItemName; "Table Name")
        {
            column(ColumnName; FieldName)
            {
                // Column properties
            }
            
            filter(FilterName; FieldName)
            {
                // Filter properties
            }
        }
    }
    
    trigger OnBeforeOpen()
    begin
        // Add pre-processing logic
    end;
}`;
}

function generateXMLPort(id: number, name: string): string {
  return `xmlport ${id} "${name}"
{
    Caption = '${name}';
    Direction = Both;
    Format = Xml;
    UseRequestPage = true;
    
    schema
    {
        textelement(RootNodeName)
        {
            tableelement(TableName; "Table Name")
            {
                fieldelement(FieldName; TableName.FieldName)
                {
                    // Field properties
                }
            }
        }
    }
    
    requestpage
    {
        layout
        {
            area(Content)
            {
                group(Options)
                {
                    Caption = 'Options';
                }
            }
        }
    }
}`;
}

function generateEnum(id: number, name: string): string {
  return `enum ${id} "${name}"
{
    Extensible = true;
    
    value(0; " ")
    {
        Caption = ' ';
    }
    
    value(1; "Option1")
    {
        Caption = 'Option 1';
    }
    
    value(2; "Option2")
    {
        Caption = 'Option 2';
    }
}`;
}