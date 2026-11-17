using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Win32;

namespace TccOrderMonitor;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        using var mutex = new Mutex(true, "TCC.FloatingOrderMonitor.SingleInstance", out var created);
        if (!created) return;
        Application.Run(new MonitorForm());
    }
}

internal static class Settings
{
    internal const string Api = "https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders";
    internal const string PublicKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A";
    private static readonly string TokenPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TCC", "OrderMonitor", "session.bin");

    internal static string? ReadToken()
    {
        try { return File.Exists(TokenPath) ? Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(TokenPath), null, DataProtectionScope.CurrentUser)) : null; }
        catch { return null; }
    }
    internal static void SaveToken(string token)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(TokenPath)!);
        File.WriteAllBytes(TokenPath, ProtectedData.Protect(Encoding.UTF8.GetBytes(token), null, DataProtectionScope.CurrentUser));
    }
    internal static void ClearToken() { try { if (File.Exists(TokenPath)) File.Delete(TokenPath); } catch { } }
    internal static void SetStartup(bool enabled)
    {
        using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
        if (key is null) return;
        if (enabled) key.SetValue("TCCFloatingOrderMonitor", $"\"{Application.ExecutablePath}\"");
        else key.DeleteValue("TCCFloatingOrderMonitor", false);
    }
}

internal sealed class OrderApi
{
    private readonly HttpClient http = new() { Timeout = TimeSpan.FromSeconds(12) };
    private string? token;
    internal OrderApi(string? session) => token = session;

    private HttpRequestMessage Request(HttpMethod method, string action, object? body = null, bool auth = true)
    {
        var request = new HttpRequestMessage(method, Settings.Api + "?action=" + Uri.EscapeDataString(action));
        request.Headers.Add("apikey", Settings.PublicKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Settings.PublicKey);
        if (auth && !string.IsNullOrWhiteSpace(token)) request.Headers.Add("x-tcc-admin-session", token);
        if (body is not null) request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        return request;
    }

    internal async Task<bool> Login(string username, string password)
    {
        using var response = await http.SendAsync(Request(HttpMethod.Post, "login", new { username, password }, false));
        var json = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException(ReadError(json));
        using var doc = JsonDocument.Parse(json);
        token = doc.RootElement.GetProperty("token").GetString();
        if (string.IsNullOrWhiteSpace(token)) throw new InvalidOperationException("The server did not return a session.");
        Settings.SaveToken(token);
        return true;
    }

    internal async Task<List<OrderInfo>> GetNewOrders()
    {
        using var response = await http.SendAsync(Request(HttpMethod.Get, "orders"));
        var json = await response.Content.ReadAsStringAsync();
        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized) throw new UnauthorizedAccessException("Your Order Desk session expired. Please sign in again.");
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException(ReadError(json));
        using var doc = JsonDocument.Parse(json);
        var list = new List<OrderInfo>();
        if (doc.RootElement.TryGetProperty("orders", out var orders) && orders.ValueKind == JsonValueKind.Array)
        foreach (var item in orders.EnumerateArray())
        {
            if (GetString(item, "status") != "new") continue;
            list.Add(new OrderInfo(
                GetString(item,"id") ?? "", GetString(item,"order_number") ?? "New order",
                GetString(item,"customer_name") ?? "Guest", GetString(item,"order_type") ?? "",
                GetString(item,"table_number") ?? "", GetString(item,"created_at") ?? "",
                GetString(item,"customer_phone") ?? "", GetDecimal(item,"total"),
                GetItems(item)));
        }
        return list.OrderBy(x => DateTime.TryParse(x.CreatedAt, out var d) ? d : DateTime.MaxValue).ToList();
    }

    internal async Task UpdateStatus(string id, string status)
    {
        using var response = await http.SendAsync(Request(HttpMethod.Patch, "update-status", new { id, status }));
        var json = await response.Content.ReadAsStringAsync();
        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized) throw new UnauthorizedAccessException("Your session expired. Please sign in again.");
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException(ReadError(json));
    }

    private static string? GetString(JsonElement e, string key) => e.TryGetProperty(key, out var p) && p.ValueKind != JsonValueKind.Null ? p.ToString() : null;
    private static decimal GetDecimal(JsonElement e, string key) => e.TryGetProperty(key, out var p) && p.TryGetDecimal(out var d) ? d : 0;
    private static string ReadError(string json) { try { using var d=JsonDocument.Parse(json); return d.RootElement.TryGetProperty("error",out var e)?e.GetString()??"Request failed.":"Request failed."; } catch { return "Request failed. Check your internet connection."; } }
    private static string GetItems(JsonElement e)
    {
        if (!e.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array) return "Items unavailable";
        return string.Join(", ", items.EnumerateArray().Select(x => (x.TryGetProperty("quantity",out var q)?q.ToString():"1")+" × "+(GetString(x,"name")??"Item")));
    }
}

internal sealed record OrderInfo(string Id,string Number,string Customer,string Type,string Table,string CreatedAt,string Phone,decimal Total,string Items)
{
    internal string Place => Type == "dine-in" ? "Table " + (string.IsNullOrWhiteSpace(Table) ? "—" : Table) : "Takeaway";
    internal string Waiting
    {
        get { if (!DateTime.TryParse(CreatedAt, out var date)) return "Waiting"; var m=Math.Max(0,(int)(DateTimeOffset.Now-DateTimeOffset.Parse(CreatedAt)).TotalMinutes); return m+" min waiting"; }
    }
}

internal sealed class MonitorForm : Form
{
    private readonly OrderApi api = new(Settings.ReadToken());
    private readonly FlowLayoutPanel list = new() { Dock=DockStyle.Fill, FlowDirection=FlowDirection.TopDown, WrapContents=false, AutoScroll=true, Padding=new Padding(8) };
    private readonly Label status = new() { AutoSize=true, ForeColor=Color.FromArgb(91,105,96), Text="Connecting…" };
    private readonly System.Windows.Forms.Timer timer = new() { Interval=4000 };
    private readonly HashSet<string> seen = new();
    private bool firstLoad=true, busy;
    private readonly Button deskButton = new() { Text="Open full Order Desk", AutoSize=true, FlatStyle=FlatStyle.Flat, BackColor=Color.FromArgb(232,239,232), ForeColor=Color.FromArgb(23,60,43) };

    internal MonitorForm()
    {
        Settings.SetStartup(true);
        Text="TCC · New Orders"; Width=390; Height=570; MinimumSize=new Size(340,300); TopMost=true;
        FormBorderStyle=FormBorderStyle.SizableToolWindow; StartPosition=FormStartPosition.Manual;
        var area=Screen.PrimaryScreen?.WorkingArea ?? new Rectangle(0,0,1200,800); Location=new Point(area.Right-Width-18,area.Bottom-Height-18);
        BackColor=Color.FromArgb(250,248,240); Font=new Font("Segoe UI",9.5f);
        var header=new Panel { Dock=DockStyle.Top, Height=76, BackColor=Color.FromArgb(23,60,43), Padding=new Padding(12) };
        var title=new Label { Text="TCC  ·  NEW ORDERS", ForeColor=Color.White, Font=new Font("Segoe UI",13,FontStyle.Bold), AutoSize=true, Location=new Point(12,10) };
        status.ForeColor=Color.FromArgb(220,235,224); status.Location=new Point(13,42);
        header.Controls.Add(title); header.Controls.Add(status);
        var footer=new FlowLayoutPanel { Dock=DockStyle.Bottom, Height=48, Padding=new Padding(8,5,8,5), BackColor=Color.White, FlowDirection=FlowDirection.RightToLeft };
        deskButton.Click += (_,_) => { try { Process.Start(new ProcessStartInfo("https://tcc-restaurant-website.pages.dev/orders.html") { UseShellExecute=true }); } catch { } };
        footer.Controls.Add(deskButton);
        Controls.Add(list); Controls.Add(footer); Controls.Add(header);
        timer.Tick += async (_,_) => await RefreshOrders();
        Shown += async (_,_) => { if (string.IsNullOrWhiteSpace(Settings.ReadToken())) { if (!await PromptLogin()) { Close(); return; } } await RefreshOrders(); timer.Start(); };
        FormClosing += (_,_) => timer.Stop();
    }

    private async Task<bool> PromptLogin()
    {
        using var dialog=new LoginForm();
        if (dialog.ShowDialog(this)!=DialogResult.OK) return false;
        try { await api.Login(dialog.Username,dialog.Password); return true; }
        catch(Exception ex) { MessageBox.Show(this,ex.Message,"TCC Order Monitor",MessageBoxButtons.OK,MessageBoxIcon.Warning); return await PromptLogin(); }
    }

    private async Task RefreshOrders()
    {
        if (busy || IsDisposed) return; busy=true;
        try
        {
            var orders=await api.GetNewOrders();
            status.Text=orders.Count+" awaiting acceptance · refreshes every 4 sec";
            var fresh=orders.Where(o=>seen.Add(o.Id)).ToList();
            if (!firstLoad && fresh.Count>0) System.Media.SystemSounds.Exclamation.Play();
            firstLoad=false;
            list.SuspendLayout(); list.Controls.Clear();
            if (orders.Count==0) list.Controls.Add(new Label { Text="No new orders right now.\nThis panel will stay open above SR POS.", AutoSize=true, Padding=new Padding(8), ForeColor=Color.FromArgb(91,105,96), Margin=new Padding(8,20,8,8) });
            foreach(var order in orders) list.Controls.Add(BuildOrderCard(order));
            list.ResumeLayout();
        }
        catch(UnauthorizedAccessException ex) { timer.Stop(); Settings.ClearToken(); status.Text="Sign-in required"; MessageBox.Show(this,ex.Message,"TCC Order Monitor",MessageBoxButtons.OK,MessageBoxIcon.Information); if(await PromptLogin()) { await RefreshOrders(); timer.Start(); } else Close(); }
        catch(Exception ex) { status.Text="Connection issue · retrying"; ToolTip tip=new(); tip.SetToolTip(status,ex.Message); }
        finally { busy=false; }
    }

    private Control BuildOrderCard(OrderInfo o)
    {
        var card=new Panel { Width=Math.Max(300, list.ClientSize.Width-34), Height=174, BackColor=Color.White, Margin=new Padding(2,2,2,10), Padding=new Padding(10), BorderStyle=BorderStyle.FixedSingle };
        var heading=new Label { Text=o.Number, Font=new Font("Segoe UI",10.5f,FontStyle.Bold), ForeColor=Color.FromArgb(23,60,43), AutoSize=true, Location=new Point(10,8) };
        var place=new Label { Text=o.Place+" · "+o.Waiting, AutoSize=true, ForeColor=Color.FromArgb(155,73,35), Location=new Point(10,34) };
        var customer=new Label { Text=o.Customer+" · "+o.Phone, AutoSize=true, ForeColor=Color.FromArgb(70,82,74), Location=new Point(10,56), MaximumSize=new Size(card.Width-20,0) };
        var items=new Label { Text=o.Items, AutoSize=true, ForeColor=Color.FromArgb(70,82,74), Location=new Point(10,78), MaximumSize=new Size(card.Width-20,34) };
        var total=new Label { Text="₹"+o.Total.ToString("0.##"), AutoSize=true, Font=new Font("Segoe UI",10,FontStyle.Bold), ForeColor=Color.FromArgb(23,60,43), Location=new Point(10,112) };
        var accept=new Button { Text="Accept & Prepare", Width=142, Height=30, Location=new Point(10,136), BackColor=Color.FromArgb(23,60,43), ForeColor=Color.White, FlatStyle=FlatStyle.Flat };
        var reject=new Button { Text="Reject", Width=78, Height=30, Location=new Point(160,136), BackColor=Color.FromArgb(255,241,238), ForeColor=Color.FromArgb(150,52,45), FlatStyle=FlatStyle.Flat };
        accept.Click += async (_,_) => await Change(o, "preparing", accept, reject);
        reject.Click += async (_,_) => { if(MessageBox.Show(this,"Reject "+o.Number+"?","Confirm rejection",MessageBoxButtons.YesNo,MessageBoxIcon.Warning)==DialogResult.Yes) await Change(o,"cancelled",accept,reject); };
        card.Controls.AddRange(new Control[]{heading,place,customer,items,total,accept,reject}); return card;
    }

    private async Task Change(OrderInfo o,string next,Button a,Button r)
    {
        a.Enabled=false;r.Enabled=false;
        try { await api.UpdateStatus(o.Id,next); await RefreshOrders(); }
        catch(Exception ex) { MessageBox.Show(this,ex.Message,"Unable to update order",MessageBoxButtons.OK,MessageBoxIcon.Error); a.Enabled=true;r.Enabled=true; }
    }
}

internal sealed class LoginForm : Form
{
    private readonly TextBox user=new() { Width=230 };
    private readonly TextBox pass=new() { Width=230, UseSystemPasswordChar=true };
    internal string Username=>user.Text.Trim(); internal string Password=>pass.Text;
    internal LoginForm()
    {
        Text="TCC Order Desk Sign in"; Width=330; Height=220; FormBorderStyle=FormBorderStyle.FixedDialog; StartPosition=FormStartPosition.CenterParent; MaximizeBox=false;MinimizeBox=false;
        var layout=new TableLayoutPanel { Dock=DockStyle.Fill, Padding=new Padding(14), ColumnCount=1, RowCount=5 };
        layout.Controls.Add(new Label { Text="Username",AutoSize=true });layout.Controls.Add(user);layout.Controls.Add(new Label { Text="Password",AutoSize=true });layout.Controls.Add(pass);
        var buttons=new FlowLayoutPanel { FlowDirection=FlowDirection.RightToLeft,Dock=DockStyle.Fill };
        var login=new Button { Text="Sign in",DialogResult=DialogResult.OK,Width=90 };var cancel=new Button { Text="Cancel",DialogResult=DialogResult.Cancel,Width=90 };buttons.Controls.Add(login);buttons.Controls.Add(cancel);layout.Controls.Add(buttons);
        Controls.Add(layout);AcceptButton=login;CancelButton=cancel;
    }
}
