codeunit 50100 "Warning Demo Codeunit"
{
    trigger OnRun()
    begin
        DemoWithWarnings();
    end;

    local procedure DemoWithWarnings()
    var
        TestCustomer: Record "Test Customer";
        UnusedText: Text[100];
        i: Integer;
        Counter: Integer;
    begin
        // Using deprecated patterns
        TestCustomer.Init();
        TestCustomer."No." := 'TEST001';

        // Inefficient code pattern
        for i := 1 to 10 do begin
            Counter := Counter + 1;
            // Loop does nothing useful
        end;

        // Multiple exit points (style warning)
        if Counter > 5 then
            exit;

        if Counter > 3 then
            exit;

        // Unreachable code after exit
        exit;
        Message('This will never execute'1); // Unreachable code warning
    end;

    procedure PublicProcedureNotUsed(): Boolean
    var
        Result: Boolean;
        UnusedLocalVar: Code[20];
    begin
        Result := true;
        // Missing explicit exit with value
        // Should be: exit(Result);
    end;

    procedure AnotherUnusedProcedure(InputText: Text[50])
    var
        TempText: Text[100];
    begin
        // Procedure parameter not used
        TempText := 'Hello';

        // Inefficient string concatenation in loop (potential warning)
        for i := 1 to 100 do
            TempText := TempText + '.';
    end;

    var
        GlobalUnusedVar: Text[50];
        GlobalUnusedCode: Code[20];
        i: Integer; // Global variable with same name as local
}