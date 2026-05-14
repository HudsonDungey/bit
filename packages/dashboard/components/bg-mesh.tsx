export function BgMesh() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="absolute -left-[200px] -top-[200px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,#635bff_0%,transparent_70%)] opacity-50 blur-[120px] will-change-transform animate-drift1 dark:opacity-30" />
      <div className="absolute -bottom-[250px] -right-[150px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,#00d4ff_0%,transparent_70%)] opacity-30 blur-[120px] will-change-transform animate-drift2 dark:opacity-20" />
    </div>
  );
}
