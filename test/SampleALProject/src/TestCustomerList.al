page 50101 "Test Customer List"
{
    PageType = List;
    SourceTable = "Test Customer";
    CardPageId = "Test Customer Card";
    ApplicationArea = All;
    UsageCategory = Lists;
    Caption = 'Test Customers';
    
    layout
    {
        area(Content)
        {
            repeater(Group)
            {
                field("No."; Rec."No.")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the number.';
                }
                
                field(Name; Rec.Name)
                {
                    ApplicationArea = All;
                }
                
                field("Unused Field"; Rec."Unused Field")
                {
                    ApplicationArea = All;
                    Visible = false; // Hidden field
                }
            }
        }
    }
    
    actions
    {
        area(Processing)
        {
            action(TestAction)
            {
                ApplicationArea = All;
                Caption = 'Test Action';
                Image = TestFile;
                
                trigger OnAction()
                var
                    UnusedActionVar: Integer;
                begin
                    Message('Action triggered');
                    // Variable declared but not used
                end;
            }
        }
    }
    
    trigger OnInit()
    var
        InitVar: Text;
    begin
        // Empty initialization
    end;
}