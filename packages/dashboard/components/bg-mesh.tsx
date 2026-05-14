export function BgMesh() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
    >
      <div className="absolute -top-[200px] -left-[200px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,#635bff_0%,transparent_70%)] opacity-55 blur-[120px] animate-drift1 will-change-transform" />
      <div className="absolute -bottom-[250px] -right-[150px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,#00d4ff_0%,transparent_70%)] opacity-35 blur-[120px] animate-drift2 will-change-transform" />
    </div>
  );
}
