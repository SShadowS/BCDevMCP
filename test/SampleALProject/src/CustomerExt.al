table 50100 "Test Customer"
{
    DataClassification = CustomerContent;
    
    fields
    {
        field(1; "No."; Code[20])
        {
            DataClassification = CustomerContent;
        }
        
        field(2; Name; Text[100])
        {
            DataClassification = CustomerContent;
        }
        
        field(3; "Unused Field"; Text[30])
        {
            DataClassification = ToBeClassified; // Should use CustomerContent - warning
        }
        
        field(4; "Obsolete Field"; Code[10])
        {
            DataClassification = CustomerContent;
            ObsoleteState = Pending;
            ObsoleteReason = 'This field is obsolete'; // This generates info/warning
        }
    }
    
    keys
    {
        key(PK; "No.")
        {
            Clustered = true;
        }
    }
    
    var
        UnusedTableVar: Text[50]; // Unused variable warning
}

page 50100 "Test Customer Card"
{
    PageType = Card;
    SourceTable = "Test Customer";
    ApplicationArea = All;
    UsageCategory = Documents;
    
    layout
    {
        area(Content)
        {
            group(General)
            {
                field("No."; Rec."No.")
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the number.';
                }
                
                field(Name; Rec.Name)
                {
                    ApplicationArea = All;
                    ToolTip = 'Specifies the name.';
                }
            }
        }
    }
    
    var
        UnusedPageVar: Integer; // Unused variable warning
        AnotherUnusedVar: Decimal; // Another warning
        
    trigger OnOpenPage()
    var
        LocalUnusedVar: Text[100]; // Local unused variable warning
    begin
        Message('Test page opened');
        // Intentionally not using the variables to generate warnings
    end;
    
    trigger OnClosePage()
    begin
        // Empty trigger
        if true then
            exit; // Unnecessary code
    end;
}